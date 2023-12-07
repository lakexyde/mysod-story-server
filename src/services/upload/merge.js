const dayjs = require("dayjs");
const os = require('os')
var ffmpeg = require('fluent-ffmpeg');
const path = require("path");
const fs = require('fs-extra');
const { getQueue } = require("../../config/queue");
var ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
var ffprobePath = require('@ffprobe-installer/ffprobe').path;
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

//https://grm-cyc.s3.us-east-1.amazonaws.com/5580151000829836
// https://grm-cyc.s3.us-east-1.amazonaws.com/sod-story/intro.mp4
const createStory = async ({ user, body }) => {

    getQueue().then(q => {
        q.push({
            id: "merge",
            channel: "video",
            method: "merge",
            payload: {
                id: "2343234235",
                upload_url: "/Users/lakexyde/dumps/sod/data/uploads/outro.mp4",
                abort: true,
            }
        })
    })

    return {
        ok: true
    }


    const SIZE = '1920x1080';

    // get the start time
    const start = dayjs();

    const home = "~".replace("~", os.homedir());
    const output = path.join(home, "dumps/sod/data/uploads/video-output.mp4");
    const result = path.join(home, "dumps/sod/data/uploads/video.mp4");
    const tmp = path.join(home, "dumps/sod/data/uploads/tmp");

    // ensure tmp directory
    fs.ensureDirSync(tmp);

    const clips = [
        // "https://grm-cyc.s3.us-east-1.amazonaws.com/sod-story/intro.mp4",
        // path.join(home, "dumps/sod/data/uploads/story.MOV"),
        // "https://grm-cyc.s3.us-east-1.amazonaws.com/sod-story/intro.mp4",

        // path.join(home, "dumps/sod/data/uploads/sod-story-intro.mp4"),
        // path.join(home, "dumps/sod/data/uploads/my-story.mp4"),
        // path.join(home, "dumps/sod/data/uploads/sod-story-outro.mp4"),

        fs.existsSync(path.join(home, "dumps/sod/data/uploads/sod-story-intro.mp4")) ? path.join(home, "dumps/sod/data/uploads/sod-story-intro.mp4") :
            "https://grm-cyc.s3.us-east-1.amazonaws.com/sod-story/intro.mp4",

        path.join(home, "dumps/sod/data/uploads/outro.mp4"),

        fs.existsSync(path.join(home, "dumps/sod/data/uploads/sod-story-outro.mp4")) ? path.join(home, "dumps/sod/data/uploads/sod-story-outro.mp4") :
        "https://grm-cyc.s3.us-east-1.amazonaws.com/sod-story/outro.mp4"
    ];

    const outputs = [];

    for (let index = 0; index < clips.length; index++) {
        const input = clips[index];

            let out = input;

            if (index == 1) {
                out = path.join(home, `dumps/sod/data/uploads/video-${index}.mp4`);
                let tmp = await writeToFile(input, path.join(home, `dumps/sod/data/uploads/tmp/video-${index}.mp4`));

                await convertClip(tmp, out, index == 1 ? path.join(home, "dumps/sod/data/uploads") : null);

                // remove the input file
                fs.removeSync(tmp);
            } else {

            }

            // await convertClip(tmp, out, index == 1 ? path.join(home, "dumps/sod/data/uploads") : null);
            outputs.push(out);

            // remove the input file
            // fs.removeSync(tmp);

            console.log("DONE WITH INPUT: ", index + 1);
    }

    // merge all videos
    await mergeClips(outputs, output, tmp);

    // downsize clip
    await downsizeClip(output, result);

    return {
        ok: true,
        message: `Finished in: ${dayjs().diff(start, 'seconds')} seconds`
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

            const newWidth = 1920;
            const newHeight = 1080;

            const ar = getAspectRatio(
                metadata.streams[0].width,
                metadata.streams[0].height,
                newWidth,
                newHeight
            )

            const cmd = ffmpeg()
                .input(input)
                .withSize(`${newWidth}x${newHeight}`)
                .withAspectRatio(ar)
                .autopad('black')
                .videoCodec('libx264')
                .audioCodec('libmp3lame')
                .audioQuality(0)
                .outputFormat('mp4')
                .outputFps(29)
                .output(output)
                .videoCodec('libx264')


            // take screenshot if needed
            if (folder) {
                cmd.takeScreenshots({
                    count: 1,
                    filename: "thumbnail.webp",
                    fastSeek: true,
                    folder,
                    timemarks: ['00:00:02.000'],
                    size: "640x480",
                });
            }

            // run the conversion
            cmd
                .on('end', () => {
                    resolve()
                })
                .on('error', (err) => {
                    reject(new Error(err));
                }).run()
            })

        /*const cmd = ffmpeg({ source: input })
            // .size('640x480')
            // .aspect('16:9')
            // .autopad('black')
            .videoCodec('libx264')
            .outputFormat('mp4')
            .outputFps(27)
            .output(output)
            .videoCodec('libx264')


        // take screenshot if needed
        if (folder) {
            cmd.takeScreenshots({
                count: 1,
                filename: "thumbnail.webp",
                fastSeek: true,
                folder,
                timemarks: ['00:00:02.000'],
                size: "640x480",
            });
        }

        // run the conversion
        cmd
            .on('end', () => {
                resolve()
            })
            .on('error', (err) => {
                reject(new Error(err));
            }).run()*/
    })
}

const mergeClips = (files, output, tmp) => {
    return new Promise((resolve, reject) => {
        const cmd = ffmpeg()
            .on('end', () => {
                resolve()
            })
            .on('error', (err) => {
                reject(new Error(err));
            })

        for (let i = 0; i < files.length; i++) {
            cmd
                .input(files[i])   
                .format('mp4')          
        }

        cmd
            .mergeToFile(output, tmp)
            
            .on('end', () => {
                // remove files
                for (var i = 0; i < files.length; i++) {
                    // fs.removeSync(files[i]);
                }
                resolve()
            })
            .on('error', (err) => {
                // remove files
                for (var i = 0; i < files.length; i++) {
                    // fs.removeSync(files[i]);
                }
                reject(new Error(err));
            });
    })
}

const downsizeClip = (input, output) => {
    return new Promise((resolve, reject) => {

        ffmpeg.ffprobe(input, (err, metadata) => {

            if (err) {
                reject(err);
                return;
            }

            const newWidth = 640;
            const newHeight = 480;

            const ar = getAspectRatio(
                metadata.streams[0].width,
                metadata.streams[0].height,
                newWidth,
                newHeight
            )

            const cmd = ffmpeg()
                .input(input)
                .withSize(`${newWidth}x${newHeight}`)
                .withAspectRatio(ar)
                .outputFormat('mp4')
                .outputFps(29)
                .output(output)

            // run the conversion
            cmd
                .on('end', () => {
                    // fs.removeSync(input);
                    resolve()
                })
                .on('error', (err) => {
                    reject(new Error(err));
                }).run()
            })
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
        if (!url.startsWith("http")) {

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
    
                // const buff = await blob.arrayBuffer()
                fs.writeFileSync(output, Buffer.from(buff), {
                    encoding: 'binary',
                });
                resolve(output)
            })
        }
    })
}

function gcd(a, b) {
    while (b) {
      a %= b;
      [a, b] = [b, a];
    }
    return a;
  }

function getAspectRatio(originalWidth, originalHeight, newWidth, newHeight) {
    const originalAspectRatio = originalWidth / originalHeight;
    const newAspectRatio = newWidth / newHeight;
  
    const gc = Math.abs(originalWidth) && Math.abs(originalHeight) ? gcd(originalWidth, originalHeight) : 1;
    const originalAspectRatioNumerator = originalWidth / gc;
    const originalAspectRatioDenominator = originalHeight / gc;
  
    const gcd2 = Math.abs(newWidth) && Math.abs(newHeight) ? gcd(newWidth, newHeight) : 1;
    const newAspectRatioNumerator = newWidth / gcd2;
    const newAspectRatioDenominator = newHeight / gcd2;
  
    if (originalAspectRatio === newAspectRatio) {
      return `${originalAspectRatioNumerator}:${originalAspectRatioDenominator}`;
    }
  
    if (originalAspectRatio > newAspectRatio) {
      return `${originalAspectRatioNumerator}:${newAspectRatioDenominator}`;
    } else {
      return `${newAspectRatioNumerator}:${originalAspectRatioDenominator}`;
    }
  }
  
  
  
  