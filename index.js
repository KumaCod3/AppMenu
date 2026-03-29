'use strict'

const express = require('express');
const morgan = require('morgan');
const bodyParser = require("body-parser");
const DBmenu = require('./DBmenu');
const db = new DBmenu();
const PORT = process.env.PORT;
const app = express();
const handlebars = require('express-handlebars').create({ defaultLayout: 'main' });

app.use(express.json());
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/ricette', async (req, res) => {
	try {
		const allRic = await db.getAllRicette();
		console.log(allRic);
		res.render('allRicette', { legends: allRic });
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

app.get('/', async (req, res) => {
	try {
		const menu = await db.getAllMenu();
		res.render('menu', { menu: menu });
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

app.get('/piano/:id', async (req, res) => {
	try {
		const _id = req.params.id;
		console.log("questo e lid " + _id);

		const menus = await db.getSettID(_id);
		res.render('piano', { menu: menus });
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

app.get('/ricetta/:id', async (req, res) => {
	try {
		const _id = req.params.id;
		console.log("questo e lid " + _id);
		const ricetta = await db._getRicettaId(_id);// cambiato
		res.render('ricetta', { menu: ricetta });
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

app.get('/listaSpesa/:id', async (req, res) => {
	try {
		const _id = req.params.id;
		console.log("questo e lid " + _id);
		const ricetta = await db._getRicettaId(_id);// cambiato
		res.render('listaSpesa', { menu: ricetta });
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

app.get('/ingredienti', async (req, res) => {
	try {
		const ingredienti = await db.getAllIngredienti();
		res.render('allIngredienti', { legends: ingredienti });
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

app.get('/ingred', async (req, res) => {
	try {
		const ingredienti = await db.getAllIngredienti();
		res.json(ingredienti);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
}); // allRic

app.post('/Ningrediente', async (req, res) => {
	try {
		const nome = req.body.Name || 'noName';
		const prezzo = req.body.Price || 0;
		await db.insertIngrediente(nome, prezzo);

		const allIngr = await db.getAllIngredienti();
		res.json(allIngr);
	} catch (err) {
		res.status(500).json({ "results": "none" });
	}
}); // alIng

app.post('/DELETEingredient', async (req, res) => {
	const Name = req.body.Name;

	await db.removeSingleIngredient(Name);
	const allInged = await db.getAllIngredienti();
	res.json(allInged);
}); // allIng

app.post('/DELETERicetta', async (req, res) => {
	const Name = req.body.Name;

	await db.removeSingleRecepit(Name);
	const allRic = await db.getAllRicette();
	res.json(allRic);
}); // ricetta

app.post('/ricet', async (req, res) => {
	try {
		const allRic = await db.getAllRicette();
		res.json(allRic);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
}); //allRic

app.post('/getAllMenu', async (req, res) => {
	try {
		const allMen = await db.getAllMenu();
		res.json(allMen);
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: err.message });
	}
}); //menu 

app.post('/loadSettimana', async (req, res) => {
	try {
		const settId = req.body.iddi;
		console.log(" In settimana cerco id: " + settId);
		const settTrovata = await db.getSettID(settId);
		if (settTrovata) {
			res.json(settTrovata);
		} else {
			res.status(404).json({ message: "Menu non trovato" });
		}
	} catch (err) {
		console.error("Errore nel recupero del menu:");
		res.status(500).json({ message: err.message });
	}
}); // piano

app.post('/insertMenu', async (req, res) => {
	try {
		const nome = req.body.Name || 'Menu Generato';
		const temperaturaScelta = req.body.Temperatura;
		console.log("Prova ad inserire: " + nome);
		await db.insertMenu(nome, temperaturaScelta);
		console.log("ci riesco: " + nome);
		const allMen = await db.getAllMenu();
		res.json(allMen);

	} catch (err) {
		console.error("Errore nella creazione menu:", err);
		res.status(500).json({ "error": "Impossibile creare il menu" });
	}
}); // menu

app.post('/genSett', async (req, res) => {
	try {
		const settimana = req.body.settimana;

		const settim = await db.generaSettimana(settimana);

		res.json(settim);

	} catch (err) {
		console.error("Errore nella creazione menu:", err);
		res.status(500).json({ "error": "Impossibile creare il menu" });
	}
}); //piano

app.post('/Nricetta', async (req, res) => {
	try {
		const nome = req.body.Name || 'noName';
		const ingredienti = req.body.Ingredienti || 'noIngred';
		const temperatura = req.body.Temperatura;
		const orario = req.body.Orario;
		const prova = req.body.Prova;
		const nota = req.body.Note;

		await db.insertRicetta(nome, ingredienti, temperatura, orario, prova, nota);
		const allRic = await db.getAllRicette();
		res.json(allRic);
	} catch (err) {
		res.status(500).json({ "results": "none" });
	}
}); // allRic

app.post('/MODricetta', async (req, res) => {
	try {
		const id = req.body.Id;
		const nome = req.body.Name || 'noName';
		const ingredienti = req.body.Ingredienti || 'noIngred';
		const temperatura = req.body.Temperatura;
		const orario = req.body.Orario;
		const prova = req.body.Prova;
		const note = req.body.Note;
		const RicRic = await db.modificaRicetta(id, nome, ingredienti, temperatura, orario, prova, note);
		res.json(RicRic);
	} catch (err) {
		res.status(500).json({ "results": "none" });
	}
}); // ricetta

app.post('/NricettaJSN', async (req, res) => {
	try {
		const nome = req.body.Name || 'noName';
		const ingredienti = req.body.Ingredienti || 'noIngred';
		const temperatura = req.body.Temperatura;
		const orario = req.body.Orario;
		const nota = req.body.Note || "";
		const prova = req.body.Prova;
		await db.insertRicetta(nome, ingredienti, temperatura, orario, prova, nota);
		res.status(200).send("OK");
	} catch (err) {
		res.status(500).json({ "results": "none" });
	}
}); // allric

app.post('/salvaSettimana', async (req, res) => {
	try {
		const settimana = req.body;
		await db.salvaSettimana(settimana);
		res.status(200).send("OK");
	} catch (err) {
		res.status(500).json({ "results": "none" });
	}
}); // piano

app.post('/liberaRicetta', async (req, res) => {
	try {
		const IDricetta = req.body._id;
		const IDmen = req.body._idMen;
		await db.liberaRicetta(IDricetta, IDmen);
		res.status(200).send("OK");
	} catch (err) {
		res.status(500).json({ "results": "none" });
	}
}); // piano

app.post('/occupaRicetta', async (req, res) => {
	try {
		const IDricetta = req.body._id;
		const IDmen = req.body._idMen;
		await db.occupaRicetta(IDricetta, IDmen);
		res.status(200).send("OK");
	} catch (err) {
		res.status(500).json({ "results": "none" });
	}
}); // piano

app.post('/refreshRic', async (req, res) => {
	try {
		await db.refreshRic();
		const allRic = await db.getAllRicette();
		res.json(allRic);
	} catch (err) {
		res.status(500).json({ "results": "none" });
	}
}); // allRic

app.post('/caricaSettimana', async (req, res) => {
	try {
		const giorni = req.body.Giorni || 'noGiorn';
		const idd = req.body.idd;
		const idMen = req.body.menID;
		console.log("Id menu " + idMen);
		await db.insertSettimana(giorni, idd, idMen);
		res.status(200).send("OK");
	} catch (err) {
		res.status(500).json({ "results": "none" });
	}
}); // piano

app.post('/NomeIngr', async (req, res) => {
	const id = req.body.Id;
	const ingred = await db.getIngredienteID(id);
	res.json(ingred);
}); // ricetta /piano /allRice

app.post('/NomeRic', async (req, res) => {
	const id = req.body.Id;
	const ricet = await db._getRicettaId(id);
	console.log("carico: " + ricet);
	res.json(ricet);
}); // ricetta

app.post('/DELETETUTTOric', async (req, res) => {
	try {
		await db.RimuoviTuttoRic();
		const allRic = await db.getAllRicette();
		res.json(allRic);
	} catch (err) {
		res.status(500).json({ "results": "none" });
	}
}) // allRic

app.post('/MenuID', async (req, res) => {
	try {
		const id = req.body.id;
		const menu = await db.getMenuID(id);
		res.json(menu);
	} catch (err) {
		res.status(500).json({ "results": "none" });
	}
}); // piano

app.post('/PitstopID', async (req, res) => {
	try {
		const id = req.body.id;
		const menu = await db.getPitstopID(id);
		res.json(menu);
	} catch (err) {
		res.status(500).json({ "results": "none" });
	}
}); // piano

app.post('/DELETETUTTOmen', async (req, res) => {
	try {
		await db.RimuoviTuttoMen();
		const allMen = await db.getAllMenu();
		res.json(allMen);
	} catch (err) {
		res.status(500).json({ "results": "none" });
	}
}); // menu

app.post('/DELETEingFROMrec', async (req, res) => {
	const Name = req.body.Name;
	const Id = req.body.Id;
	const ric = await db.removeIngRecepit(Name, Id);
	res.json(ric);
}); // ricetta

app.post('/eliminaMenu', async (req, res) => {
			try {
				const id = req.body.id;
				await db.eliminaMenu(id);
				const allMenu = await db.getAllMenu();
				res.json(allMenu);
			} catch (err) {
				res.status(500).json({ "results": "none" });
			}
		});

app.post('/aggiungiSettimana', async (req, res) => {
	try {
		const menuId = req.body.id;
		await db.aggiungiSettimana(menuId);
		const allMenu = await db.getAllMenu();
		res.json(allMenu);
	} catch (err) {
		res.status(500).json({ "results": "none" });
	}
});



app.get('/activeConfig', async (req, res) => {
	try {
		const oggi = await db.getActiveConfig();
		console.log(" Trovo oggi: "+ oggi.Pranzo);
		res.json(oggi).send("OK");
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

app.post('/setActiveConfig', async (req, res) => {
	try {
		const { settimanaId, startDayIndex } = req.body;
		console.log(settimanaId +" "+ parseInt(startDayIndex))
		await db.setActiveConfig(settimanaId, parseInt(startDayIndex));
		res.json({ success: true });
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});



// conclusione
app.use((req, res) => { 
	res.status(404).send(`<h2>Uh Oh!</h2><p>Sorry ${req.url} cannot be found here</p>`); 
}); 
 
db.init()
	.then(() => { 
		app.listen(PORT, () => {
			console.log(`Server is running on port ${PORT}`);
		});
	}) 
	.catch(err => { 
		console.error('Problem setting up the database'); 
		console.error(err); 
	});
process.on('SIGINT', async () => {
	console.log('Chiusura del server...');
	await db.close();
	process.exit(0);
});