import API from './API.js';

const Menu = {
    data: null,
    openDB: async () => {
        return await idb.openDB('cm-menu', 1, {
            async upgrade(db){
                await db.createObjectStore('categories')
                await db.createObjectStore('products', {
                    keyPath: 'id'
                })
            }
        });
    },
    load: async () => {
        // Network First
        const db = await Menu.openDB();
        try {
            // We try to fetch from the network
            const data = await API.fetchMenu();
            Menu.data = data;
            console.log(data)
            const tx = db.transaction(['categories', 'products'], 'readwrite');
            const categoryStore = tx.objectStore('categories'); 
            const productsStore = tx.objectStore('products');
            await categoryStore.clear();
            const categories = data.map(({ name },index) => categoryStore.add(name, index))
            await Promise.all(categories)
            await productsStore.clear();
            const addedProducts = data.flatMap(({ products }, categoryIndex) => products?.map(p => productsStore.add({...p, categoryId: categoryIndex})))
            await Promise.all(addedProducts);
            await tx.done;
            console.log("Data from the network");
        } catch (e) {
            console.log('Error',e)
            const count = await db.count('categories') && await db.count('products');
            // Network error, we go to the cache
            if (count) {
                const categories = await db.getAll('categories');
                const allProducts = await db.getAll('products');
                Menu.data = categories.map((cat, index)=> {
                    const products = allProducts.filter(({ categoryId }) => categoryId == index)
                    return { name:cat, products }
                })
                console.log("Data from the cache", e);
            } else {
                console.log("No data is available");
            }
        }
        if (Menu.data) {
            const imageCache = await caches.open("cm-images");
            Menu.data.forEach(c => imageCache.addAll(
                c.products.map(p=>`/data/images/${p.image}`)
            ));
        }
        Menu.render();
    },
    loadCacheFirst: async () => {
        const db = await Menu.openDB();
         if(await db.count('categories') == 0){
            const categories = await API.fetchMenu();
            categories.forEach((category) => db.add('categories', category))
         }
        Menu.data = await db.getAll('categories');
        Menu.render();
    },
    getProductById: async id => {
        if (Menu.data==null) {
            await Menu.load();
        }
        for (let c of Menu.data) {
            for (let p of c.products) {
                if (p.id==id) {
                    return p;
                }
            }
        }
        return null;
    },
    render: () => {
        let html = "";
        for (let category of Menu.data) {
            html += `
                <li>
                    <h3>${category.name}</h3>
                    <ul class='category'>
                        ${
                            category.products.map(p => `
                                <li>
                                    <article>
                                        <a href="#" 
                                            onclick="Router.go('/product-${p.id}');event.preventDefault()">
                                            <img src="/data/images/${p.image}">
                                            <h4>${p.name}</h4>
                                            <p class="price">$${p.price.toFixed(2)}<p>
                                        </a>
                                    </article>
                                </li>
                            `).join("")
                        }
                    </ul>
                </li>`;
        }
        document.querySelector("#menu").innerHTML = html;
    },
    renderDetails: async id => {
        const product = await Menu.getProductById(id);
        if (product==null) {
            console.log(`Product ${id} not found`);
            return;
        }
        document.querySelector("#details article").innerHTML = ` 
            <header>   
                <a href="#" onclick="Router.go('/'); event.preventDefault()">&lt; Back</a>
                <h2>${product.name}</h2>
                <a></a>
            </header>
            <img src="/data/images/${product.image}">
            <p class="description">${product.description}</p>
            <p class="price">$ ${product.price.toFixed(2)} ea</p>
            <button onclick="Order.add(${product.id}); Router.go('/order')">Add to cart</button>
        `;
    }

}

export default Menu;