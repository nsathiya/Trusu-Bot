var rp = require('request-promise');

// var options = {
//     method: 'POST',
//     uri: 'http://localhost:3000/collectionapi/bot_sessions',
//     body: {
//         _id: '1',
// 	userId: '1',
// 	state: 'active'
//     },
//     json: true // Automatically stringifies the body to JSON
// };
//
// rp(options)
//     .then(function (parsedBody) {
// 	    console.log(parsedBody)
// 	})
//     .catch(function (err) {
// 	    console.log(err)
// 	});

var options = {
      method: 'PUT',
      uri: 'http://localhost:3000/collectionapi/bot_sessions/1',
      body: {
          '$set': {
            'state': 'search'
          }
      },
      json: true // Automatically stringifies the body to JSON
  };

  rp(options)
      .then(function (parsedBody) {
  	    console.log(parsedBody)
  	})
      .catch(function (err) {
  	    console.log(err)
  	});
