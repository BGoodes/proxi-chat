//TODO: clean up this file
function setupRestRoutes(app, io) {
    app.post('/update-coordinates', (req, res) => {
        const { userId, coordinates } = req.body;
        console.log(`Coordinates update from REST: ${userId} - ${coordinates}`);
        io.emit('coordinatesUpdate', { userId, coordinates });
        res.send({ status: 'Coordinates updated from REST' });
    });
}

export default setupRestRoutes;
