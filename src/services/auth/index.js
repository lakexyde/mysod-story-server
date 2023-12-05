const getSession = async ({ user }) => {
    return {
        ok: true,
        data: user
    }
}

module.exports = {
    getSession
}