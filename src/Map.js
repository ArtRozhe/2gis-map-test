import DG from '2gis-maps';

class Map {
    constructor(id) {
        // захардкодил создание карты Москвы, так как задание не предполагает других городов
        this.map = DG.map(id, {
            center: [55.75088330688495, 37.62062072753907],
            zoom: 11,
            fullscreenControl: false
        });

        this.markers = [];
        this.markersData = [];
    }

    removeMarkers() {
        this.markers.forEach(marker => {
            marker.remove();
        });

        this.markers = [];
    }

    setMarkersData(markersData) {
        this.markersData = markersData;
    }

    renderMarkers() {
        if (this.markers.length > 0) {
            this.removeMarkers();
        }

        this.markersData.forEach(markerData => {
            const marker = DG.marker([markerData.lat, markerData.lon]);
            this.markers.push(marker);
            marker.addTo(this.map);
        });
    }
}

export default Map;
