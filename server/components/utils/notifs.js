function sendToast(req, res, message, colour, page) {
    const data = {
        notification: {
            message: message,
            color: colour,
            timer: config_server['toast-dismiss']
        }
    };
    res.render(page, data);
}

module.exports = {
    sendToast,
};