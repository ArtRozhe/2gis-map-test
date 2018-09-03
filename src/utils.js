export const loadData = (searchString) => {
    return fetch(`http://catalog.api.2gis.ru/2.0/catalog/marker/search?q=${searchString}&page_size=1000&region_id=32&key=ruhebf8058`)
        .then(res => res.json())
        .then(res => res.result.items);
};
