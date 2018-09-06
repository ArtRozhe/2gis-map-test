import DG from '2gis-maps';

class Map {
    constructor(id) {
        // захардкодил создание карты Москвы, так как задание не предполагает других городов
        this.map = DG.map(id, {
            center: [55.75088330688495, 37.62062072753907],
            zoom: 11,
            fullscreenControl: false
        });

        this._onZoomStart = this._onZoomStart.bind(this);
        this._onZoomEnd = this._onZoomEnd.bind(this);
        this._onResize = this._onResize.bind(this);
        this._onMoveEnd = this._onMoveEnd.bind(this);

        this.mapLatLngBounds = this.map.getBounds();

        this.map.on('zoomstart', this._onZoomStart);
        this.map.on('zoomend', this._onZoomEnd);
        // избегаем лишних рассчётов, реагируем на событие ресайза не более одного раза за 1000 мс
        // TODO: придумать, как сделать лучше, пока что это очень слабое место текущей реализации
        this.map.on('resize', DG.Util.throttle(this._onResize, 1000));
        this.map.on('moveend', this._onMoveEnd);

        this.markers = [];
        this.markersData = [];
    }

    /**
     * Очищаем все маркеры после старта зумирования
     * @private
     */
    _onZoomStart() {
        this.removeMarkers();
    }

    /**
     * После окончания зумирования рассчитываем необходимые параметры и
     * начинаем процесс отображения маркеров, если есть что отображать
     * @private
     */
    _onZoomEnd() {
        this._updateLatLngBounds();
        if (this.markersData.length > 0) {
            this.renderMarkers();
        }
    }

    /**
     * После ресайза сохраняем новые границы карты и перерисовываем маркеры
     * @private
     */
    _onResize() {
        this._updateLatLngBounds();
        this.removeMarkers();
        this.renderMarkers();
    }

    _onMoveEnd() {
        this._updateLatLngBounds();
        this.removeMarkers();
        this.renderMarkers();
    }

    _updateLatLngBounds() {
        this.mapLatLngBounds = this.map.getBounds();
    }

    /**
     * Очищаем с карты все созданные маркеры и очищаем массив
     */
    removeMarkers() {
        this.markers.forEach(marker => {
            marker.remove();
        });

        this.markers = [];
    }

    /**
     * Сохраняем массив данных для последующей генерации маркеров
     * на основе этих данных
     * @param markersData
     */
    setMarkersData(markersData) {
        this.markersData = markersData;
    }

    /**
     * Запускаем процесс рассчёта коллекции маркеров, которую нужно показать, и
     * отображения на карте
     */
    renderMarkers() {
        // TODO: придумать, как не перерисовывать маркеры, которые были на карте и на следующем этапе должны на ней остаться
        const bounds = this.mapLatLngBounds;

        if (this.markers.length > 0) {
            this.removeMarkers();
        }

        this.markersData.forEach(markerData => {
            const markerLat = markerData.lat;
            const markerLng = markerData.lon;
            // сразу выкидываю маркеры, не входящие в область видимости (сомнительная реализаци)
            if (markerLat > bounds._southWest.lat && markerLat < bounds._northEast.lat &&
                markerLng > bounds._southWest.lng && markerLng < bounds._northEast.lng) {

                const marker = DG.marker([markerLat, markerLng]);
                this.markers.push(marker);
                marker.addTo(this.map);
            }
        });
    }
}

export default Map;
