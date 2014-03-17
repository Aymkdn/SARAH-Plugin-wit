exports.action = function(data, callback, config, SARAH){
  console.log("dictation: "+data.dictation);
  // On récupère la config
  config = config.modules.wit;
  if (!config.code_api){
    callback({ 'tts': 'Merci de définir un code API pour Wit.' });
    return;
  }

  // envoyer le résultat à wit
  var data = data.dictation.replace(/ok sara(h)?/i,"");
  if (data === "") callback({'tts': "Je n'ai rien entendu"})
  else {
    requestURL({api:config.code_api, data:data, SARAH:SARAH});
    callback({});
  }
}

var requestURL = function(options){
  var http = require('https');
  console.log("Données envoyées : "+options.data);
  http.get({
    headers: {"Authorization": "Bearer "+options.api},
    hostname: "api.wit.ai",
    path: "/message?q="+encodeURIComponent(options.data)
  }, function(res) {
    var buffer=[]
    res.on('data', function (chunk) {
      buffer.push(chunk)
    }).on('end', function() {
      var gBuffer = new Buffer(buffer.reduce(function(prev, current) {
        return prev.concat(Array.prototype.slice.call(current));
      }));
      var reponse = JSON.parse(gBuffer.toString());
      if (reponse.outcome.confidence*1 > 0.5) {
        var keyword = reponse.outcome.intent;
        switch (keyword) {
          case "greetings": options.SARAH.speak("Hé. Salut, toi !"); break;
          case "allumer_la_freebox": options.SARAH.speak("OK je peux t'allumer la Freebox"); break;
        }
      } else {
        options.SARAH.speak("Désolé, mais je ne pense pas avoir compris...")
      }
    })
  }).on('error', function(e) {
    console.log("Got error: " + e.message);
  });
}
