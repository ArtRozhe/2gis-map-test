import './index.scss';
import DG from '2gis-maps';
import { loadData } from './utils';

const map = DG.map('map', {
    center: [55.75088330688495, 37.62062072753907],
    zoom: 11,
    fullscreenControl: false
});

const searchForm = document.querySelector('.search__form');
const searchInput = searchForm.querySelector('.search__input');

const onSearchSubmit = function(ev) {
    ev.preventDefault();
    const searchString = searchInput.value;

    if (searchString === '') {
        return false;
    }

    searchForm.classList.add('loading');

    loadData(searchString)
        .then(data => {
            searchForm.classList.remove('loading');
            console.log(data);
        })
        .catch(error => {
            searchForm.classList.remove('loading');
            console.log(error);
        })
};

searchForm.addEventListener('submit', onSearchSubmit);
