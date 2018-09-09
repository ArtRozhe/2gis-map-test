import DG from '2gis-maps';
import rbush from 'rbush';
import { now } from './utils';

/**
 * Обёртка над картой DG.map, скрывающая обработку событий и фильтрацию маркеров.
 */
class Map {
    constructor(config) {
        if (!config.containerId || !config.center) {
            throw new Error('config must contains containerId and center');
        }
        config.zoom = config.zoom || 11;
        config.fullscreenControl = config.fullscreenControl === undefined ? true : config.fullscreenControl;
        config.showOutsideVisibleZone = config.showOutsideVisibleZone === undefined ? 0 : config.showOutsideVisibleZone;
        config.markerIconSize = config.markerIconSize || {
            width: 22,
            height: 34
        };

        this._map = DG.map(config.containerId, {
            center: config.center,
            zoom: config.zoom,
            fullscreenControl: config.fullscreenControl
        });

        this._markerIconSize = config.markerIconSize;
        this._showOutsideVisibleZone = config.showOutsideVisibleZone;
        this._markerBoxTree = rbush();

        this._onZoomStart = this._onZoomStart.bind(this);
        this._onResize = this._onResize.bind(this);
        this._onMoveEnd = this._onMoveEnd.bind(this);

        this._map.on('zoomstart', this._onZoomStart);
        // избегаем лишних рассчётов, реагируем на событие ресайза не более одного раза за 1000 мс
        // TODO: придумать, как сделать лучше обработку resize, пока что это очень слабое место текущей реализации
        this._map.on('resize', DG.Util.throttle(this._onResize, 1000));
        this._map.on('moveend', this._onMoveEnd);

        this._markers = [];
        this._markersData = [];
    }

    /**
     * Очищаем все маркеры после старта зумирования.
     *
     * @private
     */
    _onZoomStart() {
        this.removeMarkers();
    }

    /**
     * После ресайза удаляем с карты предыдущие маркеры и отображаем новые.
     *
     * @private
     */
    _onResize() {
        this.removeMarkers();
        this.renderMarkers();
    }

    /**
     * После окончания движения удаляем с карты предыдущие маркеры и отображаем новые.
     *
     * @private
     */
    _onMoveEnd() {
        this.removeMarkers();
        this.renderMarkers();
    }

    /**
     * Очищаем с карты все созданные маркеры и очищаем массив с маркерами.
     */
    removeMarkers() {
        if (this._markers.length === 0) {
            return;
        }

        this._markers.forEach(marker => {
            marker.remove();
        });

        this._markers = [];
    }

    /**
     * Сохраняем массив данных для последующей генерации маркеров.
     *
     * @param {Array} markersData сырой массив с данными по каждому маркеру
     */
    setMarkersData(markersData) {
        this._markersData = markersData;
    }

    /**
     * Определяем, находится ли прямоугольник-маркер markerBBox внутри
     * переданной зоны zoneBBox с учётом запаса showOutsideZone.
     *
     * @param {object} markerBBox маркер в виде bounding-box в формате {minX, minY, maxX, maxY}
     * @param {object} zoneBBox зона проверки на попадание маркера в виде bounding-box в формате {minX, minY, maxX, maxY}
     * @param {number} offsetOutsideZone запас для границ zoneBBox
     * @returns {boolean}
     * @static
     */
    static isMarkerInZone(markerBBox, zoneBBox, offsetOutsideZone) {
        return !(
            markerBBox.minX < zoneBBox.minX - offsetOutsideZone ||
            markerBBox.maxX > zoneBBox.maxX + offsetOutsideZone ||
            markerBBox.minY < zoneBBox.minY - offsetOutsideZone ||
            markerBBox.maxY > zoneBBox.maxY + offsetOutsideZone
        );
    }

    /**
     * Генерируем объект по формату для rbush.
     *
     * @param {number} markerPositionX координата "x" относительно контейнера карты
     * @param {number} markerPositionY координата "y" относительно контейнера карты
     * @returns {{minX: number, minY: number, maxX: number, maxY: number}} bounding-box
     * @private
     */
    _getMarkerBBox(markerPositionX, markerPositionY) {
        const { width: markerIconWidth, height: markerIconHeight } = this._markerIconSize;
        return {
            minX: markerPositionX - markerIconWidth / 2,
            minY: markerPositionY - markerIconHeight,
            maxX: markerPositionX + markerIconWidth / 2,
            maxY: markerPositionY
        };
    }

    /**
     * Запускаем процесс фильтрации и отображения маркеров.
     */
    renderMarkers() {
        // TODO: нужно добавить очередь для обработки частых запросов
        // TODO: обдумать вынос алгоритма фильтрации маркеров в веб-воркер
        if (this._markersData.length === 0) {
            return;
        }

        if (this._markers.length > 0) {
            this.removeMarkers();
        }

        const renderStart = now();
        const mapSize = this._map.getSize();
        const renderZoneBBox = {
            minX: 0,
            minY: 0,
            maxX: mapSize.x,
            maxY: mapSize.y
        };

        this._markersData.forEach(markerData => {
            const markerLat = markerData.lat;
            const markerLng = markerData.lon;

            const markerPixelCoordinates = this._map.latLngToContainerPoint([markerLat, markerLng]);
            const markerBBox = this._getMarkerBBox(markerPixelCoordinates.x, markerPixelCoordinates.y);

            // считаем, что список маркеров отсортирован в порядке убывания приоритета, поэтому, если маркер пересекается с каким-либо ранее обработанным
            // и добавленным в дерево, он отбрасывается.
            if (
                this.constructor.isMarkerInZone(markerBBox, renderZoneBBox, this._showOutsideVisibleZone) &&
                !this._markerBoxTree.collides(markerBBox)
            ) {
                const marker = DG.marker([markerLat, markerLng]).addTo(this._map);

                this._markers.push(marker);
                this._markerBoxTree.insert(markerBBox);
            }
        });

        // eslint-disable-next-line
        console.log('rendered', now() - renderStart);
        this._markerBoxTree.clear();
    }
}

export default Map;
