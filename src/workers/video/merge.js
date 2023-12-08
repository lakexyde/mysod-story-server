const dayjs = require("dayjs");
const os = require('os')
var ffmpeg = require('fluent-ffmpeg');
const path = require("path");
const fs = require('fs-extra');
const { awsClient } = require("../../config/s3");
const { HeadObjectCommand, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const config = require("../../config");
const { UploadModel } = require("../../models");
const { getFileName } = require("../../utils/helpers");
const { genId } = require("../../utils/gen");

var ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
var ffprobePath = require('@ffprobe-installer/ffprobe').path;
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

let fps = 30;

const createStory = async (video, cb) => {

    // get the start time
    const start = dayjs();

    try {

        // if video or upload_url does not exists, return
        if (!video || !video?.upload_url) {
            throw "Bad request";
        }

        // #1. check if video exists
        if (!isLocal(video.upload_url) && !(await objectExists(new URL(video.upload_url).pathname.substring(1)))) {

            let payload = {last_attempted_at: dayjs().toISOString()}

            // move the video down the pecking order
            await UploadModel.update({id: video.id}, payload);

            throw "Upload url does not exist yet";
        }

        // await awsClient.send(new HeadObjectCommand({
        //     Bucket: config.awsBucketName,
        //     Key: new URL(video.upload_url).pathname.substring(1)
        // }))

        console.log("🎉 BEGIN CONVERSION FOR ID: ", video.id);

        // #2. Merge the clips
        // get the home directory
        const home = "~".replace("~", os.homedir());
        const output = path.join(home, "dumps/sod/data/uploads/video.webm");
        const tmp = path.join(home, "dumps/sod/data/uploads/tmp");

        // ensure tmp directory
        fs.ensureDirSync(tmp);

        // get the clips
        const clips = [
            fs.existsSync(
                path.join(home, "dumps/sod/data/uploads/sod-story-intro.mp4")) 
                ? path.join(home, "dumps/sod/data/uploads/sod-story-intro.mp4") 
                : "https://grm-cyc.s3.us-east-1.amazonaws.com/sod-story/intro.mp4",

            video.upload_url,

            fs.existsSync(
                path.join(home, "dumps/sod/data/uploads/sod-story-outro.mp4")) 
                ? path.join(home, "dumps/sod/data/uploads/sod-story-outro.mp4") 
                : "https://grm-cyc.s3.us-east-1.amazonaws.com/sod-story/outro.mp4",
        ]

        // collect the outputs
        const outputs = [];

        // loop through the inputs
        for (let index = 0; index < clips.length; index++) {
            let input = clips[index];

            let out = input
            if (index == 1) {
                out = path.join(home, `dumps/sod/data/uploads/video-${index}.webm`);
                let tmp = path.join(home, `dumps/sod/data/uploads/tmp/video-${index}.webm`);

                tmp = await writeToFile(input, tmp);

                await convertClip(tmp, out, path.join(home, "dumps/sod/data/uploads"));

                await takeScreenshot(tmp, path.join(home, "dumps/sod/data/uploads", "screen.webm" ), path.join(home, "dumps/sod/data/uploads"))

                // remove the input file
                fs.removeSync(tmp);
            } else {
                // out = path.join(home, `dumps/sod/data/uploads/video-${index}.webm`);
                // out = input;
                // await convertClip(input, out);
            }

            outputs.push(out);

            console.log("DONE WITH INPUT: ", index + 1);
        }

        // merge all videos
        await mergeClips(outputs, output, tmp, path.join(home, "dumps/sod/data/uploads"));

        // downsize clip
        // await downsizeClip(output, result, path.join(home, "dumps/sod/data/uploads"));

        // take screenshot
        // await takeScreenshot(output, path.join(home, "dumps/sod/data/uploads"))

        if (video.abort) {
            throw "Aborted";
        }

        // #3. upload the video to s3
        // get the video object key
        let objKey = getFileName(video.upload_url).split(".")[0].replace(".mp4", "")

        let video_url = new URL(video.upload_url);
        video_url.pathname = `sod-story/posts${video_url.pathname}.webm`

        // send the video to s3
        await awsClient.send(new PutObjectCommand({
            Bucket: config.awsBucketName,
            Key: `sod-story/posts/${objKey}.webm`,
            Body: fs.createReadStream(output),
            ContentType: 'video/webm',
            ACL: "public-read"
        }));

        // send thumbnail to s3
        await awsClient.send(new PutObjectCommand({
            Bucket: config.awsBucketName,
            Key: `sod-story/thumbnails/${objKey}.webp`,
            Body: fs.createReadStream(path.join(home, "dumps/sod/data/uploads", "thumbnail.webp")),
            ContentType: 'image/webp',
            ACL: "public-read"
        }));

        // #5. Update the database with video url and status
        // get database instance
        await UploadModel.update({ id : video.id }, {
            status: "pending",
            url: video_url.toString(),
            thumbnail_url: `https://grm-cyc.s3.us-east-1.amazonaws.com/sod-story/thumbnails/${objKey}.webp`
        });

        // #6. Delete the video upload object to free s3
        await awsClient.send(new DeleteObjectCommand({
            Bucket: config.awsBucketName,
            Key: new URL(video.upload_url).pathname.substring(1)
        }));

        // #4. Delete the output video
        fs.removeSync(output);

        console.log("🎉 Conversion complete 🎉 ");

    } catch (error) {
        // change video status to trash if error is "trash"
        if (error == "trash") {
            UploadModel.update({id: video.id} , {status: "trash"});
        }
        console.log(error);
    } finally {
        cb()
        // log the time it took to complete the request
        const end = dayjs().diff(start, 'seconds');
        console.log("Finished in: ", end, "seconds");
    }
}

module.exports = {
    createStory
}

const convertClip = (input, output, folder) => {
    return new Promise((resolve, reject) => {

        ffmpeg.ffprobe(input, (err, metadata) => {

            if (err) {
                reject(err);
                return;
            }

            let maxDuration = config.nodeEnv.startsWith("dev") ? 50 : 45;

            // if portrait, trash
            if (metadata.streams[0].height >= metadata.streams[0].width) {
                reject("trash")
                return;
            }

            // reject video if more than 45 seconds
            if (metadata.streams[0].duration > maxDuration) {
                reject("trash")
                return;
            }

            let f = metadata.streams[0].r_frame_rate.split("/");

            fps = (f[0] || 30) / (f[1] || 1);
            fps = fps < 20 ? 30 : fps;

            console.log("Converting clip with dimension: ", `${metadata.streams[0].width}x${metadata.streams[0].height}`, "and FPS: ", metadata.streams[0].r_frame_rate)

            const baseResolution = '1920:1080';

            let sc = getForceAspectRatioOption(`${metadata.streams[0].width}:etadata.streams[0].width}`, baseResolution, 'enable')

            const id = genId()

            const cmd = ffmpeg()
                .input(input)
                .complexFilter(`[0:v]scale=${baseResolution}:force_original_aspect_ratio=${sc},pad=${baseResolution}:(ow-iw)/2:(oh-ih)/2[v];[0:a]anull[a]`)
                .outputOptions('-map [v]')
                .outputOptions('-map [a]')
                // .outputOptions('-c:v libx264')
                // .outputOptions('-c:a aac')
                .outputOptions('-c:v libvpx') // Use libvpx for WebM video codec
                .outputOptions('-c:a libvorbis') 
                .outputOptions('-auto-alt-ref 0') // Disable automatic reference frame generation for older browsers
                .outputOptions('-qmin 10') // Adjust quality settings as needed
                .outputOptions('-qmax 42') // Adjust quality settings as needed
                .outputOptions('-crf 20') 
                .save(output)
                .on('start', (commandLine) => {
                    config.spawnedProcesses.push({id, cmd});

                    if (config.nodeEnv.startsWith("dev")) {
                        console.log('Spawned ffmpeg with command:', commandLine);
                    }  
                    console.log("🔀 Converting video clip");
                })
                .on('end', () => {
                    
                    config.spawnedProcesses = config.spawnedProcesses.filter(e => e.id !== id);

                    console.log('✅ Done converting video clip'); 
                    resolve();
                })
                .on('error', (err) => {
                    // remove from spawned processes
                    config.spawnedProcesses = config.spawnedProcesses.filter(e => e.id !== id);

                    reject(err);
                })
            })
    })
}

const mergeClips = (files, output, tmp, folder) => {
    return new Promise((resolve, reject) => {

        const cmd = ffmpeg();
        const id = genId();

        const baseResolution = '640:360'; // Adjust the frame rate as needed

        const complexFilter = files.map((_, index) => {
            const inputLabel = `[${index}:v]scale=${baseResolution}:force_original_aspect_ratio=decrease,pad=${baseResolution}:(ow-iw)/2:(oh-ih)/2[video${index}]`;
            return inputLabel;
        });

        for (let i = 0; i < files.length; i++) {
            cmd.input(files[i])
        }

        cmd
            // .inputOptions('-shortest') 
            .complexFilter(complexFilter.join(';'))
            // .outputOptions('-c:v libx264')
            // .outputOptions('-c:a aac')
            .outputOptions('-c:v libvpx') // Use libvpx for WebM video codec
            .outputOptions('-c:a libvorbis') 
            .outputOptions('-shortest') 
            // .outputOptions('-r 30') 
            .outputOptions('-auto-alt-ref 0')
            .outputOptions('-qmin 10') // Adjust quality settings as needed
            .outputOptions('-qmax 42') // Adjust quality settings as needed
            .outputOptions('-crf 20') 
            .mergeToFile(output, tmp)
            .on('start', (_) => {
                console.log('🎉 Merging clips'); 
                config.spawnedProcesses.push({id, cmd});
            })
            .on('end', () => {
                // remove files
                for (var i = 0; i < files.length; i++) {
                    // fs.removeSync(files[i]);
                    if (files[i].includes(`video-${i}`)) {
                        fs.removeSync(files[i])
                    }
                }

                // remove from spawned processes
                config.spawnedProcesses = config.spawnedProcesses.filter(e => e.id !== id);

                console.log('✅  Done Merging clips'); 
                resolve();
            })
            .on('error', (err) => {
                // remove from spawned processes
                config.spawnedProcesses = config.spawnedProcesses.filter(e => e.id !== id);
                reject(new Error(err));
            })
    })
}

const takeScreenshot = (input, output, folder) => {
    return new Promise((resolve, reject) => {
        const id = genId();
        const cmd = ffmpeg(input);

        cmd
            .screenshots({
                count: 1,
                filename: "thumbnail.webp",
                // fastSeek: true,
                folder,
                timemarks: ['00:00:08.000'],
                size: "640x360",
            })
            .output(output)
            .on('start', (_) => {
                console.log('📷 Taking screeshot'); 

                config.spawnedProcesses.push({id, cmd});
            })
            .on('end', () => {
                console.log('✅ Screenshot taken'); 
                fs.removeSync(output)

                // remove from spawned processes
                config.spawnedProcesses = config.spawnedProcesses.filter(e => e.id !== id);

                resolve();
            })
            .on('error', (err) => {
                // remove from spawned processes
                config.spawnedProcesses = config.spawnedProcesses.filter(e => e.id !== id);

                reject(err)
            })
            .run();
    })
}   

/**
 * 
 * @param {string} url 
 * @param {string} output 
 * @returns 
 */
function writeToFile(url, output) {
    return new Promise((resolve, reject) => {
        if (isLocal(url)) {
            (async function () {
                const fileTypeModule = await import('file-type');
                const { fileTypeFromFile } = fileTypeModule;
                const type = await fileTypeFromFile(url);
                let p = output.split('.');
                if (p.length >= 2) {
                    p[p.length - 1] = type.ext;
                } else {
                    p[p.length] = type.ext;
                }

                output = p.join(".");
                fs.copySync(url, output, { overwrite: true })
                resolve(output);
            })();
        } else {
            fetch(url).then(async res => {
                if (!res.ok) {
                    reject("Error fetching video");
                }
    
                const fileTypeModule = await import('file-type');
                const { fileTypeFromBuffer } = fileTypeModule;
    
                const buff = await res.arrayBuffer();
                const type = await fileTypeFromBuffer(buff);
    
                let p = output.split(".");
                if (p.length >= 2) {
                    p[p.length - 1] = type.ext;
                } else {
                    p[p.length] = type.ext;
                }
    
                output = p.join(".");
    
                fs.writeFileSync(output, Buffer.from(buff), {
                    encoding: 'binary',
                });
                resolve(output)
            })
        }
    })
}

function objectExists(key) {
    return new Promise((resolve, reject) => {
        awsClient.send(new HeadObjectCommand({
            Bucket: config.awsBucketName,
            Key: key
        }))
        .then(res => {
            if (res.$metadata.httpStatusCode !== 200) {
                reject(false);
                return;
            } 

            switch (res.$metadata.httpStatusCode) {
                case 200: return resolve(true);
                default: return reject(false);
            }
        })
        .catch(err => reject(false));
    })
}

const isLocal = (u) => !u.startsWith("http"); 

function getForceAspectRatioOption(originalResolution, destinationResolution, mode) {
    const [originalWidth, originalHeight] = originalResolution.split(':').map(Number);
    const [destinationWidth, destinationHeight] = destinationResolution.split(':').map(Number);
  
    const originalAspectRatio = originalWidth / originalHeight;
    const destinationAspectRatio = destinationWidth / destinationHeight;
  
    if (originalAspectRatio < destinationAspectRatio && mode !== 'disable') {
      return 'increase';
    } else if (originalAspectRatio > destinationAspectRatio && mode !== 'disable') {
      return 'decrease';
    } else {
      return 'disable';
    }
}
  