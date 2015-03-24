exports.action = function(data, callback, config, SARAH){
  console.log("[wit] dictation: "+data.dictation);
  // On récupère la config
  config = config.modules.wit;
  if (!config.code_api){
    callback({ 'tts': 'Merci de définir un code API pour Wit.' });
    return;
  }

  // envoyer le résultat à wit
  // il ne faut envoyer que la partie qui nous intéresse de data.dictation
  data.dictation = data.dictation.replace(/sara(h) /i,"");
  if (data.dictation === "") callback({'tts': "Je n'ai rien entendu"})
  else {
    requestURL({api:config.code_api, data:data, SARAH:SARAH});
    callback({});
  }
}

function getRandom(max) {
  var min = 0;
  return Math.round(Math.random() * (max - min) + min)
}

var requestURL = function(options){
  var http = require('https');
  var request = require('request');
  
  http.get({
    headers: {"Authorization": "Bearer "+options.api},
    hostname: "api.wit.ai",
    path: "/message?v=20150126&q="+encodeURIComponent(options.data.dictation)
  }, function(res) {
    var buffer=[]
    res.on('data', function (chunk) {
      buffer.push(chunk)
    }).on('end', function() {
      var gBuffer = new Buffer(buffer.reduce(function(prev, current) {
        return prev.concat(Array.prototype.slice.call(current));
      }));
      // reponse reçue de Wit
      var reponse = JSON.parse(gBuffer.toString());
      console.log("[wit] "+reponse);
      // on regarde si la confidence est suppérieure à 0.5
      if (reponse.outcomes[0].confidence*1 > 0.5) {
        var keyword = reponse.outcomes[0].intent;
        // le mot clé retourné est composé de {plugin}_{action}
        var plugin = keyword.split("_")[0];
        var action = keyword.split("_").slice(1).join("_");
        var sentences, data;
        
        // ensuite, basé sur le mot clé on va effectuer des actions
        // ici un exemple avec freebox et netatmo
        // dans "data" on va mettre les informations à transmettre au plugin
        switch (plugin) {
          case "freebox": {
            switch (action) {
              case "tv_on": 
              case "sound_up":
              case "sound_down": {
                data="key="+action.replace(/\_([a-z])/g, function(a) { return a.toUpperCase() }).replace(/\_/g,"");
                break;
              }
            }
            break;
          }
          case "netatmo": {
            switch (action) {
              case "get_thermostat": {
                data="command="+action.replace(/\_/g,"");
                break;
              }
              case "set_up": {
                data="command=getthermostat&askme=up";
                break;
              }
            }
            
            break;
          }
        }

        // si data existe alors on envoit une requête au plugin
        if (data) {
          // on contacte localement le plugin 
          console.log("[wit] je lance la requête http://127.0.0.1:8080/sarah/"+plugin+"?"+data);
          request({ 'uri' : 'http://127.0.0.1:8080/sarah/'+plugin+'?'+data }, function (err, response, body) {
            if (err || response.statusCode != 200) {
              // si erreur on envoie une notification
              SARAH.speak("Désolé mais je n'ai pas réussi à contacter le plugin "+plugin);
            }
          })
        }
      } else {
        options.SARAH.speak("Désolé, mais je ne pense pas avoir compris...")
      }
    })
  }).on('error', function(e) {
    console.log("[wit] Got error: " + e.message);
  });
}
