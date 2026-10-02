/**
 * DADOS DO CARDÁPIO
 * -------------------
 * Aqui ficam só os dados: a lista de produtos da loja (nome, preço, emoji
 * de reserva), os textos/ícones de cada categoria, quais produtos aparecem
 * em "Sugestões da casa" e os dias da semana usados no cardápio semanal.
 * Não tem nenhuma lógica aqui — só as "constantes" que o resto do site usa.
 */

const PRODUTOS = {
  "Doces":[["Pé de moça",2.00,"🌰"],["Pé de moleque",1.50,"🥜"],["Paçoca",0.50,"🥜"],["Jujuba",2.00,"🍬"],["Pingo de leite",0.50,"🥛"],["Trento",3.00,"🍫"],["Goiabinha",2.50,"🍑"],["Bauducco",2.00,"🍪"],["Roll",2.50,"🍥"],["Amendoim",1.00,"🥜"],["Barra de chocolate",8.00,"🍫"],["Ana Maria",5.00,"🍪"],["Fofura",4.00,"🍫"],["Torcida",4.00,"🌽"],["Pirulito de iogurte",1.50,"🍭"],["Pirulitão",2.00,"🍭"],["Ouro branco",2.00,"🍡"],["Halls",2.00,"❄️"],["Trident",3.00,"🫧"],["Mentos",3.00,"🍬"],["Freegels",2.50,"🫧"],["Chiclete Mentos",0.50,"🫧"],["Gamadinho",0.15,"🍬"],["Bala Juquinha",0.15,"🍬"],["Bala Fini",2.00,"🐻"]],
  "Sobremesas":[["Mousse de maracujá",8.00,"🥭"],["Pavê de maracujá",10.00,"🍰"],["Mousse de Nutella",8.00,"🍫"],["Pavê de Nutella",10.00,"🍰"],["Bolo de pote",10.00,"🧁"],["Delícia de morango",8.00,"🍓"],["Delícia de abacaxi",8.00,"🍍"],["Iogurte grego",4.50,"🥣"]],
  "Lanches":[["Empadão de frango",16.00,"🥧"],["Empadão de camarão",25.00,"🦐"],["Mini pizza",3.00,"🍕"],["Mini pizza de Nutella",5.00,"🍕"],["Esfiha",3.50,"🫓"],["Tapioca de mussarela",6.00,"🧀"],["Tapioca de frango",8.00,"🍗"],["Tapioca de carne seca",10.00,"🥩"],["Tapioca de Nutella",10.00,"🍫"],["Pão com ovo",4.00,"🍳"],["Pão com ovo e queijo (1 ovo)",5.00,"🥪"],["Pão com 2 ovos e queijo",6.00,"🥪"]],
  "Bebidas":[["Yopro",10.00,"🥤"],["Kapo",4.00,"🧃"],["Suco caixinha",4.00,"🧃"],["Del Valle lata",5.00,"🥫"],["Guaravita",2.20,"🥤"],["Guaraviton",4.50,"🥤"],["Matte",4.50,"🧉"],["Cokinha",3.50,"🥤"],["Guaraná pet",3.50,"🥤"],["Pepsi pet",3.50,"🥤"],["Água sem gás",2.00,"💧"],["Água com gás",3.00,"🫧"],["Água saborizada",6.00,"🍋"],["Coca lata",5.00,"🥤"],["Guaraná lata",5.00,"🥤"],["Fanta uva/laranja lata",5.00,"🍊"],["Pepsi lata",5.00,"🥤"],["Schweppes",5.00,"🍋"],["H2O",6.00,"💧"],["Redbull",10.00,"⚡"],["Monster",12.00,"⚡"],["Coca 2 litros",13.00,"🥤"]]
};

const ICONE_CATEGORIA = {"Doces":"🍬","Sobremesas":"🍮","Lanches":"🥪","Bebidas":"🥤"};

const COR_CATEGORIA = {"Doces":"#ffffff","Sobremesas":"#ffffff","Lanches":"#ffffff","Bebidas":"#ffffff"};

const TEXTO_CATEGORIA = {"Doces":"Docinhos para adoçar a tarde","Sobremesas":"Para fechar a refeição com sabor","Lanches":"Para matar a fome de verdade","Bebidas":"Geladinhas para acompanhar"};

const DESTAQUES = ["Empadão de frango","Tapioca de carne seca","Mini pizza de Nutella","Pavê de Nutella","Bolo de pote","Coca lata"];

const DIAS_SEMANA=[["seg","Segunda"],["ter","Terça"],["qua","Quarta"],["qui","Quinta"],["sex","Sexta"],["sab","Sábado"]];
