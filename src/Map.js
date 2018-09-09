import DG from '2gis-maps';
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

        this._isFilterMarkersBusy = false;
        this._needToUpdateMarkers = false;
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
        this._updateMarkers();
    }

    /**
     * После окончания движения удаляем с карты предыдущие маркеры и отображаем новые.
     *
     * @private
     */
    _onMoveEnd() {
        this.removeMarkers();
        this._updateMarkers();
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
     * @param {Object} markerBBox маркер в виде bounding-box в формате {minX, minY, maxX, maxY}
     * @param {Object} zoneBBox зона проверки на попадание маркера в виде bounding-box в формате {minX, minY, maxX, maxY}
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
     * Возвращает текущие границы карты в формате {minX, minY, maxX, maxY}
     * @returns {Object} текущие границы карты в формате {minX, minY, maxX, maxY}
     * @private
     */
    _getBoundsBBox() {
        const mapSize = this._map.getSize();
        return {
            minX: 0,
            minY: 0,
            maxX: mapSize.x,
            maxY: mapSize.y
        };
    }
    /**
     * Генерируем объект по формату для rbush.
     *
     * @param {number} markerPositionX координата "x" относительно контейнера карты
     * @param {number} markerPositionY координата "y" относительно контейнера карты
     * @returns {Object} bounding-box в формате {minX, minY, maxX, maxY}
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
     * Собираем данные о маркерах и текущем состоянии карты в формате, необходимом для фильтрации
     * @returns {Object} необходимые и достаточные данные для работы алгоритма фильтрации маркеров
     * @private
     */
    _getPreparedDataForFilter() {
        const markersData = this._markersData.map(markerData => {
            const { lat, lon: lng } = markerData;
            const markerPixelCoordinates = this._map.latLngToContainerPoint([lat, lng]);
            const bBox = this._getMarkerBBox(markerPixelCoordinates.x, markerPixelCoordinates.y);

            return {
                lat,
                lng,
                bBox
            };
        });

        return {
            markersData,
            boundsBBox: this._getBoundsBBox(),
            showOutsideBoundsOffset: this._showOutsideVisibleZone
        };
    }

    /**
     * Фильтрация данных о маркерах на основе видимой области карты и положении маркеров относительно друг друга.
     * Важно отметить, что метод не мутирует существующий объект с данными, а возвращает новый объект.
     * @param {Array} markersData масив с данными о маркерах
     * @param {Object} boundsBBox границы карты в формате {minX, minY, maxX, maxY}
     * @param {number} showOutsideVisibleZone запас для видимой области карты, который влияет на попадание маркера в область
     * @returns {Promise}
     * @private
     */
    _filter(markersData, boundsBBox, showOutsideVisibleZone) {
        return new window.Promise(resolve => {

            const filteredData = markersData.filter(markerData => {
                const markerBBox = markerData.bBox;

                if (
                    this.constructor.isMarkerInZone(markerBBox, boundsBBox, showOutsideVisibleZone) &&
                    !this._markerBoxTree.collides(markerBBox)
                ) {
                    this._markerBoxTree.insert(markerBBox);
                    return true;
                }

                return false;
            });

            this._markerBoxTree.clear();
            resolve(filteredData);
        });
    }

    /**
     * Запускаем процесс фильтрации и отображения маркеров.
     */
    _updateMarkers() {
        if (this._isFilterMarkersBusy) {
            this._needToUpdateMarkers = true;
            return;
        }

        this._isFilterMarkersBusy = true;

        // TODO: нужно добавить очередь для обработки частых запросов
        // TODO: обдумать вынос алгоритма фильтрации маркеров в веб-воркер
        if (this._markersData.length === 0) {
            return;
        }

        if (this._markers.length > 0) {
            this.removeMarkers();
        }

        const renderStart = now();

        const { markersData, boundsBBox, showOutsideBoundsOffset } = this._getPreparedDataForFilter();

        this._filter(markersData, boundsBBox, showOutsideBoundsOffset)
            .then(data => {
                this._isFilterMarkersBusy = false;

                data.forEach(markerData => {
                    const { lat, lng } = markerData;
                    const marker = DG.marker([lat, lng]).addTo(this._map);
                    this._markers.push(marker);
                });
                
                //eslint-disable-next-line
                console.log('rendered', now() - renderStart);

                if (this._needToUpdateMarkers) {
                    this._updateMarkers();
                    this._needToUpdateMarkers = false;

                }
            });
    }

    showMarkers() {
        this._updateMarkers();
    }
}
import rbush from 'rbush';

import { now } from './utils';

export default Map;
