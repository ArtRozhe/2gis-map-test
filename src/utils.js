export const loadData = (searchString) => {
    return fetch(`http://catalog.api.2gis.ru/2.0/catalog/marker/search?q=${searchString}&page_size=15000&region_id=32&key=ruhebf8058`)
        .then(res => res.json())
        .then(res => res.result.items)
        // eslint-disable-next-line
        .catch(error => console.log('Ошибка при загрузке данных', error));
};

export const now = window.performance && window.performance.now
    ? performance.now.bind(performance)
    : Date.now.bind(Date);
