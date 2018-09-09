import filter from './filter';

export default (self) => {
    self.addEventListener('message', (event) => {
        const { markersData, boundsBBox, showOutsideVisibleZone } = event.data;
        const filteredData = filter(markersData, boundsBBox, showOutsideVisibleZone);
        self.postMessage(filteredData);
    });
};
