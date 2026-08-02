import { syncCatalog } from "../lib/catalog.js";

const result = await syncCatalog({
  products: !process.argv.includes("--categories-only"),
  onProgress(progress) {
    if (progress.phase === "products") console.log(`Produtos: ${progress.current}/${progress.total} (pagina ${progress.page}/${progress.pages})`);
    else console.log(`Categorias: ${progress.current}/${progress.total}`);
  }
});
console.log(`Catalogo sincronizado: ${result.categoriesCount} categorias e ${result.productsCount} produtos.`);
process.exit(0);
