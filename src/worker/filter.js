import rbush from 'rbush';

const isMarkerInZone = (markerBBox, boundsBBox, offsetOutsideZone) => {
    return !(
        markerBBox.minX < boundsBBox.minX - offsetOutsideZone ||
        markerBBox.maxX > boundsBBox.maxX + offsetOutsideZone ||
        markerBBox.minY < boundsBBox.minY - offsetOutsideZone ||
        markerBBox.maxY > boundsBBox.maxY + offsetOutsideZone
    );
};

const markersBBoxTree = rbush();

const filter = (markersData, boundsBBox, showOutsideVisibleZone) => {
    const filteredData = [];

    markersData.forEach(markerData => {
        const markerBBox = markerData.bBox;

        if (isMarkerInZone(markerBBox, boundsBBox, showOutsideVisibleZone) && !markersBBoxTree.collides(markerBBox)) {
            filteredData.push(markerData);
            markersBBoxTree.insert(markerBBox);
        }
    });

    markersBBoxTree.clear();

    return filteredData;
};

export default filter;
