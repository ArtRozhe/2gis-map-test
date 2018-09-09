import './index.scss';
import './favicon.ico';

import { loadData } from './utils';
import mapConfig from './config';
import Map from './Map';

const searchForm = document.querySelector('.js-search__form');
const searchInput = searchForm.querySelector('.js-search__input');
const searchSubmitButton = searchForm.querySelector('.js-search__submit');

const map = new Map(mapConfig);

const onSearchSubmit = (ev) => {
    ev.preventDefault();
    const searchString = searchInput.value;

    if (searchString === '') {
        return false;
    }

    // очистка всех маркеров до начала загрузки данных
    map.removeMarkers();

    searchForm.classList.add('loading');
    searchSubmitButton.disabled = true;

    loadData(searchString)
        .then(data => {
            searchForm.classList.remove('loading');
            searchSubmitButton.disabled = false;

            // сохранение данных и отображение маркеров
            map.setMarkersData(data);
            map.showMarkers();
        })
        .catch(() => {
            searchForm.classList.remove('loading');
            searchSubmitButton.disabled = false;
        });
};

searchForm.addEventListener('submit', onSearchSubmit);
