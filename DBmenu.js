const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const ingredientiSchema = new mongoose.Schema({
	Name: { type: String, required: true },
	Price: { type: Number, required: true },
});
const Ingrediente = mongoose.model('Ingrediente', ingredientiSchema);

const ricettaSchema = new mongoose.Schema({
	Name: { type: String, required: true },
	Ingredienti: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ingrediente' }],
	Temperatura: { type: Number, required: true },
	Orario: { type: Number, required: true },
	Note: { type: String, default: "" },
	Menus: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Menu' }],
	Settimane: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Settimana' }],
	Prova: { type: Boolean, required: true, default: false }
});
const Ricetta = mongoose.model('Ricetta', ricettaSchema);

const settimanaSchema = new mongoose.Schema({
	Name: { type: String, required: true },
	Temperatura: { type: Number, required: true },
	Giorni: [{
		Nome: { type: String },
		Pranzo: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Ricetta'
		},
		Cena: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Ricetta'
		}
	}],
	Menu: { type: mongoose.Schema.Types.ObjectId, ref: 'Menu' }
});
const Settimana = mongoose.model('Settimana', settimanaSchema);

const menuSchema = new mongoose.Schema({
	Name: { type: String, required: true },
	Temperatura: { type: Number, required: true },
	Settimane: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Settimana' }]
})
const Menu = mongoose.model('Menu', menuSchema);

const programma = new mongoose.Schema({
	Data: { type: Date, required: true },
	Pranzo: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Ricetta'
	},
	Cena: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Ricetta'
	},
	Settimana: { type: mongoose.Schema.Types.ObjectId, ref: 'Settimana' }
})
const Programma = mongoose.model('Programma', programma);

class DBmenu {
	constructor() {
		//	this.dbUrl = 'mongodb://127.0.0.1:27017/menu';
		// this.dbUrl = 'mongodb://192.168.1.15:27017/menu';
		this.dbUrl = process.env.MONGODB_URI;
	}

	async init() {
		try {
			await mongoose.connect(this.dbUrl, {
				serverSelectionTimeoutMS: 5000
			});
			console.log('Connesso a MongoDB tramite Mongoose!');
		} catch (err) {
			console.error('Errore di connessione a MongoDB:', err);
			throw err;
		}
	}

	async getAllRicette() {
		let ricette = [];
		try {
			ricette = await Ricetta.find()
				.populate('Ingredienti')
				.populate({
					path: 'Settimane',
					populate: { path: 'Menu' }
				})
				.lean();
			console.log("cerco tutte ricette, trovo: " + ricette.length);
		} catch (err) {
			console.error('C\'è stato un problema con l\'estrazione delle ricette:', err);
			throw err;
		}
		return ricette;
	}// /ricette /DELETERicetta /ricet /Nricetta /DELETETUTTOric /CleanRic

	async getAllIngredienti() {
		let ingredienti = [];
		try {
			ingredienti = await Ingrediente.find().lean();
		} catch (err) {
			console.error('C\'è stato un problema con l\'estrazione degli ingredienti:', err);
			throw err;
		}
		return ingredienti;
	} // /ingredienti e  /ingred //Ningrediente /DELETEingredient

	async removeSingleIngredient(name) {
		let updatedItem = null;
		try {
			let item = await Ingrediente.findOneAndDelete({ 'Name': name });
			if (item == null) {
				return null;
			}
		} catch (err) {
			throw err;
		}
		return;
	} // /DELETEingredient

	async removeSingleRecepit(name) {
		let updatedItem = null;
		console.log("Rimuovo: " + name);
		try {
			let item = await Ricetta.findOneAndDelete({ 'Name': name });
			if (item == null) {
				return null;
			}
		} catch (err) {
			console.error(err);
			throw err;
		}
		return;
	} // /DELETERicetta

	async RimuoviTuttoRic() {
		try {
			await Ricetta.deleteMany({}); // per droppare tutte ricette!!!!
			return null;
		} catch (err) {
			console.error(err);
			throw err;
		}
	} // /DELETETUTTOric

	async RimuoviTuttoMen() {
		try {
			await Settimana.deleteMany({}); // per droppare tutte ricette!!!!
			await Menu.deleteMany({}); // per droppare tutte ricette!!!!
			return null;
		} catch (err) {
			console.error(err);
			throw err;
		}
	} // /DELETETUTTOmen

	async refreshRic() {
		try {
			await Ricetta.updateMany({}, { $set: { Menus: [], Settimane: [] } });
			const settimane = await Settimana.find({ Menu: { $exists: true, $ne: null } }).lean();

			const ricettaMenuMap = new Map();
			const ricettaSettimanaMap = new Map();

			for (const sett of settimane) {
				const menuId = sett.Menu;
				const settId = sett._id;

				for (const giorno of sett.Giorni) {
					const pasti = [giorno.Pranzo, giorno.Cena];
					for (const ricettaId of pasti) {
						if (ricettaId) {
							const rIdStr = ricettaId.toString();

							if (!ricettaMenuMap.has(rIdStr)) {
								ricettaMenuMap.set(rIdStr, new Set());
							}
							ricettaMenuMap.get(rIdStr).add(menuId.toString());

							if (!ricettaSettimanaMap.has(rIdStr)) {
								ricettaSettimanaMap.set(rIdStr, new Set());
							}
							ricettaSettimanaMap.get(rIdStr).add(settId.toString());
						}
					}
				}
			}

			const allTargetIds = new Set([...ricettaMenuMap.keys(), ...ricettaSettimanaMap.keys()]);
			const bulkOps = [];

			for (const ricettaId of allTargetIds) {
				const menus = ricettaMenuMap.has(ricettaId) ? Array.from(ricettaMenuMap.get(ricettaId)) : [];
				const weeks = ricettaSettimanaMap.has(ricettaId) ? Array.from(ricettaSettimanaMap.get(ricettaId)) : [];

				bulkOps.push({
					updateOne: {
						filter: { _id: ricettaId },
						update: { $set: { Menus: menus, Settimane: weeks } }
					}
				});
			}

			if (bulkOps.length > 0) {
				await Ricetta.bulkWrite(bulkOps);
			}
			return { success: true, message: `Aggiornate ${bulkOps.length} ricette.` };

		} catch (err) {
			console.error("Errore durante il refresh delle ricette:", err);
			throw err;
		}
	}// /refreshRic

	async salvaSettimana(settimana) {
		try {
			const idSettimana = settimana._id;
			await Settimana.findByIdAndUpdate(
				idSettimana,
				settimana,
				{ new: true, runValidators: true }
			);

		} catch (err) {
			console.error('Errore durante il salvataggio della settimana:', err);
		}
	}

	async liberaRicetta(ricettaID, idMen) {
		try {
			await Ricetta.findByIdAndUpdate(
				ricettaID,
				{ $pull: { Menus: idMen } },
				{ new: true, runValidators: true }
			);

		} catch (err) {
			console.error('Errore durante il salvataggio della settimana:', err);
		}
	} // salvaSettimana

	async occupaRicetta(ricettaID, idMen) {
		try {
			await Ricetta.findByIdAndUpdate(
				ricettaID,
				{ $push: { Menus: idMen } },
				{ new: true, runValidators: true }
			);

		} catch (err) {
			console.error('Errore durante il salvataggio della settimana:', err);
		}
	} //  occupaRicetta

	async insertSettimana(giorni, id, idMen) {
		try {
			const giorniProcessati = [];

			const nomiGiorni = [
				"1", "2", "3", '4', "5", "6", "7", "prova"
			];

			for (let i = 0; i < nomiGiorni.length; i++) {
				let pranzoId = null;
				let cenaId = null;
				try {
					const g = giorni[i];

					pranzoId = await this._getRicettaId(g.Pranzo);
					cenaId = await this._getRicettaId(g.Cena);



					if (pranzoId == null) {
						console.log("NOME nuova ricetta: " + g.Pranzo);
						pranzoId = await this.generaRicettaTXT(g.Pranzo, 1);
						console.log("id nuova ricetta: " + pranzoId);
					}
					if (cenaId == null) {
						console.log("NOME nuova ricetta: " + g.Cena);
						cenaId = await this.generaRicettaTXT(g.Cena, 2);
						console.log("id nuova ricetta: " + cenaId);
					}

					await Ricetta.findByIdAndUpdate(
						pranzoId,
						{ $addToSet: { Menus: idMen } }, // Aggiunge solo se unico
						{ new: true }
					);
					await Ricetta.findByIdAndUpdate(
						cenaId,
						{ $addToSet: { Menus: idMen } }, // Aggiunge solo se unico
						{ new: true }
					);

				} catch (err) {

				}

				giorniProcessati.push({
					Nome: nomiGiorni[i],
					Pranzo: pranzoId,
					Cena: cenaId
				});
			}

			await Settimana.findByIdAndUpdate(
				id,
				{ $set: { Giorni: giorniProcessati } },
				{ new: true }
			);

		} catch (err) {
			console.error('Errore durante l\'inserimento della settimana/menu:', err);
			throw err;
		}
	} // caricaSettimana

	async _getRicettaId(identificatore) {
		let ricetta = null;
		try {
			ricetta = await Ricetta.findById(identificatore);
		} catch (e) {
			// Se non è un ID valido, cerca per Nome
			ricetta = await Ricetta.findOne({ Name: identificatore });
		}
		return ricetta;
	} // /NomeRic

	async insertRicetta(nome, ingred, temperatura, orario, prova, nota) {
		let ingredArray = [];
		for (let i = 0; i < ingred.length; i++) {
			const nomeGiro = ingred[i];
			let ingredienti = nomeGiro.length > 0 ? nomeGiro : "noIng";

			let ingrediente = null;
			try {
				ingrediente = await Ingrediente.findById(ingredienti);
			} catch (err) {
				try {
					ingrediente = await Ingrediente.findOne({ Name: ingredienti });
				} catch (err) {
					console.error('C\'è stato un problema nel trovare la ingrediente:', err);
					throw err;
				}
			}
			if (ingrediente == null) {
				try {
					let newIngrediente = new Ingrediente({
						Name: ingredienti,
						Price: 0
					});
					await newIngrediente.save();
					ingrediente = newIngrediente;

				} catch (err) {
					console.error('C\'è stato un problema con l\'inserimento delingrediente:', err);
					throw err;
				}
			}
			ingredArray.push(ingrediente._id);
		}
		try {
			const newRicetta = new Ricetta({
				Name: nome,
				Ingredienti: ingredArray,
				Temperatura: temperatura,
				Orario: orario,
				Note: nota || "",
				Prova: prova
			});
			await newRicetta.save();
		} catch (err) {
			console.error("Errore inserimento ricetta: " + err);
			throw err;
		}
	} // /Nricetta /NricettaJSN

	async generaRicettaTXT(nome, orario) {
		try {
			const newRicetta = new Ricetta({
				Name: nome,
				Ingredienti: [],
				Temperatura: 0,
				Orario: orario,
				Note: "note",
				Prova: true
			});
			await newRicetta.save();
			return newRicetta._id;
		} catch (err) {
			console.error("auuua " + err);
		}
	} // /Nricetta /NricettaJSN

	async modificaRicetta(id, nome, ingred, temperatura, orario, prova, note) {
		let ingredArray = [];
		for (let i = 0; i < ingred.length; i++) {
			const nomeGiro = ingred[i];
			let ingredienti = nomeGiro.length > 0 ? nomeGiro : "noIng";

			let ingrediente = null;
			try {
				ingrediente = await Ingrediente.findById(ingredienti);
			} catch (err) {
				try {
					ingrediente = await Ingrediente.findOne({ Name: ingredienti });
				} catch (err) {
					console.error('C\'è stato un problema nel trovare la ingrediente:', err);
					throw err;
				}
			}
			if (ingrediente == null) {
				try {
					let newIngrediente = new Ingrediente({
						Name: ingredienti,
						Price: 0
					});
					await newIngrediente.save();
					ingrediente = newIngrediente;

				} catch (err) {
					console.error('C\'è stato un problema con l\'inserimento delingrediente:', err);
					throw err;
				}
			}
			ingredArray.push(ingrediente);
		}
		try {
			const updatedRicetta = await Ricetta.findByIdAndUpdate(
				id,
				{
					Name: nome,
					Ingredienti: ingredArray,
					Temperatura: temperatura,
					Orario: orario,
					Prova: prova,
					Note: note
				},
				{ new: true }
			);

			if (!updatedRicetta) {
				console.error("Ricetta non trovata " + id);
			} else {
				console.log("Ricetta aggiornata:", updatedRicetta);
				return updatedRicetta;
			}
		} catch (err) {
			console.error("Errore durante l'aggiornamento della ricetta:", err);
		}
	} // /MODricetta

	async insertMenu(nome, temperatura) {
		let newMenu = null;
		try {
			newMenu = new Menu({
				Name: nome,
				Temperatura: temperatura,
				Settimane: []
			});
			await newMenu.save();

		} catch (err) {
			console.error('C\'è stato un problema con l\'inserimento del menu :', err);
			throw err;
		}
		await this.popolaMenu(newMenu);
		return newMenu;
	} // /Nmenu

	async popolaMenu(newMenu) {
		const menID = newMenu._id;
		const nomiSettimana = [
			"1", "2", "3", '4', "5", "6", "7", "prova"
		];

		for (let i = 0; i < 4; i++) {
			const n = i + 1;

			// Creiamo l'array di oggetti seguendo esattamente il tuo schema
			const giorniDaInserire = nomiSettimana.map(giorno => ({
				Nome: giorno,
				Pranzo: null, // Riferimento ObjectId vuoto
				Cena: null    // Riferimento ObjectId vuoto
			}));

			try {
				const newSett = new Settimana({
					Name: `Settimana ${n}`,
					Temperatura: newMenu.Temperatura,
					Giorni: giorniDaInserire, // Inserimento dell'array strutturato
					Menu: menID
				});

				await newSett.save();
				newMenu.Settimane.push(newSett);
			} catch (err) {
				console.error(`Errore durante il salvataggio della Settimana ${n}:`, err);
				throw err;
			}
		}

		await newMenu.save();
	} // insertMenu()

	async generaSettimana(settimana) {
		try {
			const temperaturaScelta = settimana.Temperatura;
			const menuId = settimana.Menu;

			let candidati = {};

			try {
				candidati = await Ricetta.find({
					Temperatura: { $in: [temperaturaScelta, 3, 0] },
					Menus: { $ne: menuId }
				});
			} catch (err) {
				console.error('There was a problem finding the ricette' + err);
				throw err;
			}

			const giorniSettimana = [
				"1", "2", "3", '4', "5", "6", "7", "prova"
			];

			const idRicetteUsateInQuestaSettimana = new Set();
			const ingredientiLastSeen = new Map();

			const getIngIds = (ricetta) => {
				if (!ricetta || !ricetta.Ingredienti) return [];
				return ricetta.Ingredienti.map(ing => ing.toString());
			};

			const calcolaPunteggio = (ricetta, giornoIndex) => {
				const ingIds = getIngIds(ricetta);
				let distanzaMinima = 1000;
				for (let ingId of ingIds) {
					if (ingredientiLastSeen.has(ingId)) {
						const distanza = giornoIndex - ingredientiLastSeen.get(ingId);
						if (distanza < distanzaMinima) distanzaMinima = distanza;
					}
				}
				return distanzaMinima + Math.random();
			};

			const selezionaRicetta = async (orariAmmessi, giornoIndex, ricettaDaEvitare = null) => {
				// Filtro 1: Orario compatibile e non usata nella settimana corrente
				let pool = candidati.filter(r =>
					orariAmmessi.includes(r.Orario) &&
					!idRicetteUsateInQuestaSettimana.has(r._id.toString())
				);

				// Filtro 2: Evita ingredienti usati nel pasto precedente dello STESSO giorno
				if (ricettaDaEvitare) {
					const ingredientiVietati = new Set(getIngIds(ricettaDaEvitare));
					const poolFiltrato = pool.filter(r => {
						const ingredientiR = getIngIds(r);
						return !ingredientiR.some(ing => ingredientiVietati.has(ing));
					});

					// Se il filtro ingredienti svuota il pool, lo ignoriamo per non lasciare il pasto vuoto
					if (poolFiltrato.length > 0) {
						pool = poolFiltrato;
					}
				}

				if (pool.length === 0) return null;

				// Ordinamento per varietà (punteggio distanza)
				pool.sort((a, b) => calcolaPunteggio(b, giornoIndex) - calcolaPunteggio(a, giornoIndex));
				const scelta = pool[0];

				// Segna come usata
				idRicetteUsateInQuestaSettimana.add(scelta._id.toString());
				getIngIds(scelta).forEach(id => ingredientiLastSeen.set(id, giornoIndex));

				// Aggiorna la ricetta nel DB aggiungendo il riferimento al Menu
				await Ricetta.findByIdAndUpdate(scelta._id, {
					$addToSet: { Menus: menuId }
				});

				return scelta;
			};

			// 2. Generazione dei giorni
			const nuoviGiorni = [];
			for (let i = 0; i < giorniSettimana.length; i++) {
				// Cerchiamo il pranzo (Orario 1 o 3)
				const pranzo = await selezionaRicetta([1, 3], i, null);

				// Cerchiamo la cena (Orario 2 o 3) passandogli il pranzo per evitare duplicati di ingredienti
				const cena = await selezionaRicetta([2, 3], i, pranzo);

				nuoviGiorni.push({
					Nome: giorniSettimana[i],
					Pranzo: pranzo ? pranzo._id : null,
					Cena: cena ? cena._id : null
				});
			}

			// 3. Salvataggio finale su Settimana
			const settimanaAggiornata = await Settimana.findByIdAndUpdate(
				settimana._id,
				{ $set: { Giorni: nuoviGiorni } },
				{ new: true }
			);

			return settimanaAggiornata;

		} catch (err) {
			console.error("Errore generazione settimana:", err);
			throw err;
		}
	} // /genSett

	async insertIngrediente(nome, prezzo) {
		let newIngrediente = null;
		try {
			newIngrediente = new Ingrediente({
				Name: nome,
				Price: prezzo
			});
			await newIngrediente.save();

		} catch (err) {
			console.error('C\'è stato un problema con l\'inserimento delingrediente:', err);
			throw err;
		}
		return newIngrediente;
	} // /Ningrediente

	async removeIngRecepit(nome, id) {
		try {
			console.log("Cerco ricetta:" + nome + " con ID ingrediente:" + id);

			// Trova la ricetta per nome e rimuovi l'ingrediente specificato
			const updatedRicetta = await Ricetta.findOneAndUpdate(
				{ Name: nome },
				{ $pull: { Ingredienti: id } },
				{ new: true }
			);

			if (!updatedRicetta) {
				console.error("Ricetta non trovata");
				return null;
			}

			console.log("Ricetta aggiornata:", updatedRicetta);
			return updatedRicetta;
		} catch (err) {
			console.error('C\'è stato un problema nel rimuovere l\'ingrediente dalla ricetta:', err);
			throw err;
		}
	} // /DELETEingFROMrec

	async getAllMenu() {
		try {
			const menus = await Menu.find()
				.populate({
					path: 'Settimane',
					populate: {
						path: 'Giorni.Pranzo Giorni.Cena',
						model: 'Ricetta',
						populate: {
							path: 'Ingredienti',
							model: 'Ingrediente'
						}
					}
				})
				.lean();

			return menus;
		} catch (err) {
			console.error('Errore durante l\'estrazione completa del menu:', err);
			throw err;
		}
	}

	async getIngredienteID(_id) {
		let ingrediente = null;
		try {
			ingrediente = await Ingrediente.findById(_id).lean();
		} catch (err) {
			console.error('C\'è stato un problema nel trovare la ingrediente:', err);
			throw err;
		}
		return ingrediente;
	} // /NomeIngr

	async getMenuID(_id) {
		let menu = null;
		try {
			menu = await Menu.findById(_id)
				.populate('Settimane')
		} catch (err) {
			console.error('C\'è stato un problema nel trovare il menu:', err);
			throw err;
		}
		return menu;
	} // /MenuID

	async getPitstopID(_id) {
		let RicetteFree = [];
		try {
			// Explicitly include recipes not in this menu, or with no menus at all
			RicetteFree = await Ricetta.find({
				$or: [
					{ Menus: { $ne: _id } },
					{ Menus: { $exists: false } },
					{ Menus: { $size: 0 } },
					{ Menus: null }
				]
			}).lean();
			//	console.log('Ricette libere trovate per ID: ', RicetteFree);
		} catch (err) {
			console.error('C\'è stato un problema nel trovare le ricette libere:', err);
			throw err;
		}
		return RicetteFree;
	} // /PitstopID

	async getSettID(_id) {
		console.log(" In db cerco id: " + _id);
		let settim = null;
		try {
			settim = await Settimana.findById(_id)
				.populate({
					path: 'Giorni.Pranzo Giorni.Cena',
					model: 'Ricetta',
					populate: {
						path: 'Ingredienti',
						model: 'Ingrediente'
					}
				}).lean();
		} catch (err) {
			console.error('C\'è stato un problema nel trovare la settimana:', err);
			throw err;
		}
		return settim;
	} // /pian

	async eliminaMenu(id) {
		try {
			// First find the menu to get its weeks
			const menu = await Menu.findById(id);
			if (!menu) throw new Error("Menu non trovato");

			// Delete all associated weeks
			if (menu.Settimane && menu.Settimane.length > 0) {
				await Settimana.deleteMany({ _id: { $in: menu.Settimane } });
			}

			// Delete the menu itself
			await Menu.findByIdAndDelete(id);

			return { success: true };
		} catch (err) {
			console.error("Errore durante l'eliminazione del menu:", err);
			throw err;
		}
	}

	async aggiungiSettimana(menuId) {
		try {
			const menu = await Menu.findById(menuId).populate('Settimane');
			if (!menu) throw new Error("Menu non trovato");

			const numSett = menu.Settimane.length + 1;
			const nomiGiorni = ["1", "2", "3", "4", "5", "6", "7", "prova"];
			const giorniDaInserire = nomiGiorni.map(giorno => ({
				Nome: giorno,
				Pranzo: null,
				Cena: null
			}));

			const newSett = new Settimana({
				Name: `Settimana ${numSett}`,
				Temperatura: menu.Temperatura,
				Giorni: giorniDaInserire,
				Menu: menuId
			});

			await newSett.save();
			menu.Settimane.push(newSett._id);
			await menu.save();

			return { success: true };
		} catch (err) {
			console.error("Errore durante l'aggiunta della settimana:", err);
			throw err;
		}
	}


	async getActiveConfig() {
		const inizioGiorno = new Date();
		inizioGiorno.setHours(0, 0, 0, 0);
		const fineGiorno = new Date();
		fineGiorno.setHours(23, 59, 59, 999);

		return await Programma.findOne({
			Data: {
				$gte: inizioGiorno,
				$lte: fineGiorno
			}
		})
			.populate('Pranzo')
			.populate('Cena')
			.populate('Settimana');
	}

	async setActiveConfig(sett, giornoPartenza) {
		this.svuotaProgramma();
		const oggi = new Date();
		oggi.setHours(0, 0, 0, 0);
		const settimana = await this.getSettID(sett);
		console.log("trovo: " + settimana.Name);
		const totaleGiorni = settimana.Giorni.length;
		var seq = 0;
		for (let i = 0; i < totaleGiorni; i++) {

			const currentIndex = (giornoPartenza + i) % totaleGiorni;
			const datiGiorno = settimana.Giorni[currentIndex];
			if (!datiGiorno.Pranzo && !datiGiorno.Cena) {
				continue;
			}
			const dataCorrente = new Date(oggi);
			dataCorrente.setDate(oggi.getDate() + seq);
			seq++;
			const nuovoProgramma = new Programma({
				Data: dataCorrente,
				Pranzo: datiGiorno.Pranzo,
				Cena: datiGiorno.Cena,
				Settimana: settimana._id
			});
			await nuovoProgramma.save();
		}
	}

	async settaSettimana(settimana) {
		this.svuotaProgramma();
		const oggi = new Date();
		oggi.setHours(0, 0, 0, 0);

		const totaleGiorni = settimana.Giorni.length;
		var seq = 0;
		for (let i = 0; i < totaleGiorni; i++) {

			const datiGiorno = settimana.Giorni[i];
			if (!datiGiorno.Pranzo && !datiGiorno.Cena) {
				continue;
			}
			const dataCorrente = new Date(oggi);
			dataCorrente.setDate(oggi.getDate() + seq);
			seq++;
			const nuovoProgramma = new Programma({
				Data: dataCorrente,
				Pranzo: datiGiorno.Pranzo,
				Cena: datiGiorno.Cena,
				Settimana: settimana._id
			});
			await nuovoProgramma.save();
		}
	}

	async svuotaProgramma() {
		try {
			const risultato = await Programma.deleteMany({});
			console.log(`Eliminati ${risultato.deletedCount} programmi dal database.`);
			return risultato;
		} catch (errore) {
			console.error("Errore durante l'eliminazione dei programmi:", errore);
			throw errore;
		}
	}

	async close() {
		try {
			await mongoose.disconnect();
			console.log('Disconnesso da MongoDB.');
		} catch (err) {
			console.error('Errore durante la disconnessione da MongoDB:', err);
		}
	}
}
module.exports = DBmenu;