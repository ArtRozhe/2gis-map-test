import './index.scss';
import { loadData } from './utils';
import Map from './Map';

const searchForm = document.querySelector('.js-search__form');
const searchInput = searchForm.querySelector('.js-search__input');
const searchSubmitButton = searchForm.querySelector('.js-search__submit');

const map = new Map('map');

const onSearchSubmit = function(ev) {
    ev.preventDefault();
    const searchString = searchInput.value;

    if (searchString === '') {
        return false;
    }

    // очистка всех маркеров
    map.removeMarkers();

    searchForm.classList.add('loading');
    searchSubmitButton.disabled = true;

    loadData(searchString)
        .then(data => {
            searchForm.classList.remove('loading');
            searchSubmitButton.disabled = false;

            // сохранение данных и отображение маркеров
            map.setMarkersData(data);
            map.renderMarkers();
        })
        .catch(error => {
            // eslint-disable-next-line
            console.log(error);
            searchForm.classList.remove('loading');
            searchSubmitButton.disabled = false;
        })
};

searchForm.addEventListener('submit', onSearchSubmit);
