# map-test

Для запуска проекта локально:
1. `npm install`
2. `npm start`

Параметр `page_size` в запросе к API выставлен на `15000`.

Первые два уровня задания реализованы полностью. Третий уровень реализован частично.
После реализации первых двух уровней решил, что алгоритм можно вынести в веб-воркер, потом
наткнулся на реализацию https://github.com/2gis/general, использовал подход работы с веб-воркером, 
спасибо за интересный код)

На данный момент локальная фильтрация прямо в классе Map закомментирована, используется вариант работы с
веб-воркером. На собственной машине, вариант с веб-воркером работает медленнее, однако, учитывая, что алгоритм
фильтрации маркеров в реальных условиях должен быть сложнее, а так же на странице возможно выполнение большого
количество кода в основном потоке. Учитывая это, в дальнейшем можно получить выгоду в виде более главдкой анимации
и большей отзывчивости интерфейса, так как код фильтрации никак не будет влиять на другие процессы на странице.

В плане оптимизации текущего решения, вижу вариант использования canvas для отрисовки слоя с маркерами. На данный момент
для каждого маркера создаётся DOM элемент, над которым затем производятся манипуляции. Это сильно замедляет работу и 
делает анимацию не такой плавной, какой она может быть. Конечно, возможность использования зависит от условий, в которых
приложение должно работать. Вариант с DOM элементом для каждого маркера будет работать даже в очень старых браузерах, 
тогда как поддержка canvas присутствует в относительно новых версиях браузеров.

Также, для уменьшения времени работы кода, можно было бы не очищать все маркеры с карты при движении с одинаковым зумом.
Присутствующие маркеры, которые попадают в видимую область карты должны участвовать в отборе на следующей итерации, а не
удаляться и создаваться заново.
