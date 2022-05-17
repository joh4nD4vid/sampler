// Appel de express, on instancie les objets de express
const express = require('express');
const app = express();
const router = express.Router();

const path = require('path');


// Appel de notre page grâce à l'objet router
router.get('/',function(req,res){

    res.sendFile(path.join(__dirname+'/index.html'));

});


// On configure le router pour aller chercher le bon dossier
app.use(express.static(path.join(__dirname, 'public')), router);


// Configuration du port
app.listen(process.env.port || 8080);