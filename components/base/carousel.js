const fila = document.querySelector('.contenedor-carousel');
const peliculas = document.querySelectorAll('.pelicula');

const flechaRight = document.getElementById('arrow-right');
const flechaLeft = document.getElementById('arrow-left');

flechaRight.addEventListener('click', () => {
    fila.scrollLeft += fila.offsetWidth;

    const indicadorActivo = document.querySelector('.indicador .activo');
    if(indicadorActivo.nextSibling){
        indicadorActivo.nextSibling.classList.add('activo');
        indicadorActivo.classList.remove('activo');
    }
});

flechaLeft.addEventListener('click', () => {
    fila.scrollLeft -= fila.offsetWidth;
});

const numeroPaginas = Math.ceil( peliculas.length / 5);

for(let i = 0; i < numeroPaginas; i++ ){
    const indicador = document.createElement('button');

    if(i === 0){
        indicador.classList.add('activo');
    }
    document.querySelector('.indicadores').appendChild(indicador);
    indicador.addEventListener('click', (e) => {
        fila.scrollLeft = i * fila.offsetWidth;

        document.querySelector('.indicadores .activo').classList.remove('activo');
        e.target.classList.add('activo');
    });
}
