import work from 'webworkify-webpack';

/**
 * Принимает данные, отправляет на обработку веб-воркеру, по завершению отправление результат обратно
 * в место вызова. Для контроля порядка исполнения используется структура данных "Очередь".
 */
export default class Filter {
    constructor() {
        this.worker = work(require.resolve('./worker'));
        this.queue = [];
        this.currentJob = undefined;

        this.worker.onmessage = (ev) => {
            if (this.currentJob === undefined) {
                return;
            }

            const { data } = ev;
            const { resolve } = this.currentJob;
            this.currentJob = undefined;

            this._dequeue();
            resolve(data);
        }
    }

    /**
     * Извлечение следующего элемента в очереди работ, передача данных элемента в веб-воркер.
     * @private
     */
    _dequeue() {
        if (this.currentJob !== undefined) {
            return;
        }

        const job = this.queue.shift();

        if (job === undefined) {
            return;
        }

        this.worker.postMessage(job.data);
        this.currentJob = job;
    }

    /**
     * Фильтрация данных о маркерах на основе видимой области карты и положении маркеров относительно друг друга.
     * Важно отметить, что метод не мутирует существующий массив с данными, данные возвращаются в новом массиве.
     * @param {Array} markersData масив с данными о маркерах
     * @param {Object} boundsBBox границы карты в формате {minX, minY, maxX, maxY}
     * @param {number} showOutsideVisibleZone запас для видимой области карты, который влияет на попадание маркера в область
     * @returns {Promise}
     */
    doFilter(markersData, boundsBBox, showOutsideVisibleZone) {
        return new window.Promise(resolve => {
            const data = {
                markersData,
                boundsBBox,
                showOutsideVisibleZone
            };

            this.queue.push({ data, resolve });
            this._dequeue();
        })
    }
}
