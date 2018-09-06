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
        config.showOutsizeVisibleZone = config.showOutsizeVisibleZone === undefined ? 0 : config.showOutsizeVisibleZone;
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
        this._showOutsizeVisibleZone = config.showOutsizeVisibleZone;
        this._markerBoxTree = rbush();

        this._onZoomStart = this._onZoomStart.bind(this);
        this._onZoomEnd = this._onZoomEnd.bind(this);
        this._onResize = this._onResize.bind(this);
        this._onMoveEnd = this._onMoveEnd.bind(this);

        this._map.on('zoomstart', this._onZoomStart);
        this._map.on('zoomend', this._onZoomEnd);
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
     * После окончания зумирования рассчитываем необходимые параметры и
     * начинаем процесс отображения маркеров, если есть что отображать.
     *
     * @private
     */
    _onZoomEnd() {
        if (this._markersData.length > 0) {
            this.renderMarkers();
        }
    }

    /**
     * После ресайза сохраняем новые границы карты и перерисовываем маркеры.
     *
     * @private
     */
    _onResize() {
        this.removeMarkers();
        this.renderMarkers();
    }

    _onMoveEnd() {
        this.removeMarkers();
        this.renderMarkers();
    }

    /**
     * Очищаем с карты все созданные маркеры и очищаем массив с маркерами.
     */
    removeMarkers() {
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
     * Генерируем объект по формату для rbush.
     *
     * @param {number} x координата "x" относительно контейнера карты
     * @param {number} y координата "y" относительно контейнера карты
     * @returns {{minX: number, minY: number, maxX: number, maxY: number}} объект для rbush
     * @private
     */
    _getBBox({ x, y }) {
        const { width, height } = this._markerIconSize;
        return {
            minX: x - width / 2,
            minY: y - height,
            maxX: x + width / 2,
            maxY: y
        }
    }

    /**
     * Определяем, находится ли маркер (прямоугольник) в допускаемых границах отображения,
     * с учётом запаса _showOutsizeVisibleZone (px) у видимой области карты.
     *
     * @param {number} minX минимальная координата "x" прямоугольника
     * @param {number} minY минимальная координата "y" прямоугольника
     * @param {number} maxX максимальная координата "x" прямоугольника
     * @param {number} maxY максимальная координата "y" прямоугольника
     * @returns {boolean}
     * @private
     */
    _isMarkerInRenderZone({ minX, minY, maxX, maxY }) {
         const mapSize = this._map.getSize();
         const showOutsizeVisibleZone = this._showOutsizeVisibleZone;
         return !(
             minX < -showOutsizeVisibleZone ||
             maxX > mapSize.x + showOutsizeVisibleZone ||
             minY < -showOutsizeVisibleZone ||
             maxY > mapSize.y + showOutsizeVisibleZone
         );
    }

    /**
     * Запускаем процесс , которую нужно показать, и процесс
     * отображения маркеров на карте
     */
    renderMarkers() {
        // TODO: нужно добавить очередь для обработки частых запросов
        // TODO: обдумать вынос алгоритма фильтрации маркеров в веб-воркер
        // TODO: после zoomend сразу срабатывает moveend, нужно добавить ограничение на количество запросов к функции в единицу времени
        if (this._markersData.length === 0) {
            return;
        }

        // TODO: придумать, как не перерисовывать маркеры, которые были на карте и на следующем этапе должны на ней остаться
        if (this._markers.length > 0) {
            this.removeMarkers();
        }

        const renderStart = now();

        this._markersData.forEach(markerData => {
            const markerLat = markerData.lat;
            const markerLng = markerData.lon;
            const markerPixelCoordinates = this._map.latLngToContainerPoint([markerLat, markerLng]);
            const bBox = this._getBBox(markerPixelCoordinates);

            // алгоритм строится на предположении, что данные отсортированы таким образом, что каждый последующий
            // маркер ниже предыдущего по приоритету, поэтому, если маркер пересекается с каким-либо ранее обработанным
            // и добавленным в дерево, он отбрасывается. Другого
            if (this._isMarkerInRenderZone(bBox) && !this._markerBoxTree.collides(bBox)) {
                const marker = DG.marker([markerLat, markerLng]).addTo(this._map);

                this._markers.push(marker);
                this._markerBoxTree.insert(bBox);
            }
        });

        // eslint-disable-next-line
        console.log('rendered', now() - renderStart);
        this._markerBoxTree.clear();
    }
}

export default Map;
