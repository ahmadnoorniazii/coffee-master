import Menu from './Menu.js';
import Order from './Order.js';
import Router from './Router.js';

navigator.serviceWorker.register("/serviceworker.js");

(async () => {
    if(navigator?.storage?.persist){
        if(!await navigator.storage.persisted()){
            const result = await navigator.storage.persist();
            console.log(`Was Persistent Storage Request granted? ${result}`);
        } else {
            console.log(`Persistent Storage already granted`)
        }
    }
})();

(async function (){
    if(navigator?.storage?.estimate){
        const q = await navigator.storage.estimate();
        console.log(`Estimate Quota available: ${q.quota/1024/1024}MB`);
        console.log(`Quota used: ${q.usage}`);
    }
})()

window.addEventListener("DOMContentLoaded", () => {
    Router.init();
    Menu.load();
    Order.render();
 } );
