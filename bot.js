const botBuilder = require('claudia-bot-builder')
const rp = require('minimal-request-promise')
const rp_nm = require('request-promise');
const fbTemplate = botBuilder.fbTemplate
const fbAPI = 'https://graph.facebook.com/'
const fbVersion = 'v2.6/'
const uuidV1 = require('uuid/v1');

/////////OPTIONS FOR SUPPLIER//////////////
//const SUPPLIEREMAIL = 'osman.mendoza09@gmail.com'
const SUPPLIEREMAIL ='shaheen@bestbevhk.com'

const makeProductTemplate = (products) => {
  var template = new fbTemplate.Generic();
  var i = 0;
  products.forEach( p => {
    if (i < 10) {
      i++
      var desc = ''
      if (p.count) {
        desc = p.count + ' type(s) of packaging'
        template.addBubble(p.title, desc)
                .addButton('Order', 'ORDER_TITLE-' + p.title)
      } else {
        // desc = p.description.substring(0,50) + '\n' + p.price + ' ' + p.currency
        // template.addBubble(	p.order_unit + ' of ' + p.casing_quantity + ' ' + p.casing_unit +'(s)', desc)
        //         .addImage('https://trusu.co/cfs/files/Attachments/' + p.picture)
        //         .addButton('Order', 'ORDER_PRODUCT-' + p.title + '-' + p._id)
        desc = p.order_unit + ' of ' + p.casing_quantity + ' ' + p.casing_unit +'(s)' + '\n' + p.price + ' ' + p.currency
        template.addBubble(p.title,  desc)
                .addImage('https://trusu.co/cfs/files/Attachments/' + p.picture)
                .addButton('Order', 'ORDER_PRODUCT-' + p.title + '-' + p._id)
      }
      return template
    } else {
      return null
    }
  });
  return template
}

const groupBy = (products, key) => {
  countMap = {}
  products.forEach((p) => {

    if (countMap[p[key]])
      countMap[p[key]]++
    else
      countMap[p[key]] = 1;
  })

  groupProducts = []
  Object.keys(countMap).forEach((title) => {
    groupProducts.push({
      'title': title,
      'count': countMap[title]
    })
  })
  // console.log('groupProducts', groupProducts)
  return groupProducts
}



// requestPromise.post('https://graph.facebook.com/v2.6/me/messages?access_token=' + fbAccessToken, options).then(
//   function (response) {
//     console.log('got response', response.body, response.headers);
//   },
//   function (response) {
//     console.log('got error', response.body, response.headers, response.statusCode, response.statusMessage);
//   }
// );

var token = ''

const _constructResponse = (request, session) => {

  message_state = ''
  if (!session){

    var options = {
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            _id: request.sender,
            facebookId: request.sender,
            state: 'active',
            shoppingCart: '',
            poi: '',
            quantity : '',
            message: ''
        })
    };
    return rp.post('https://trusu.co/collectionapi/bot_sessions', options)
      .then((res) => {
        console.log('Session made for user ' + request.sender)
        message_state = 'active'

        return new fbTemplate.Button('Welcome to Trusu\'s bot for BestBevHK. Please sign up.')
          .addButton('Sign Up', 'https://trusu.co/facebook_auth/fb_signUp/' + request.sender)
          .get();
      })
  } else {
    message_state = session.state
  }

  if((!request.postback) && (message_state != 'search'
                          && message_state != 'order-quantity'
                          && message_state != 'order-message')) {
    //console.log('request', request)
    const url = fbAPI + fbVersion + request.sender + '?fields=first_name&access_token=' + token
    return rp.get(url)
      .then((res) => {
        const user = JSON.parse(res.body)
        return new fbTemplate.Button('Hey ' + user.first_name + '! How may I help you today?')
          .addButton('Order Products', 'ORDER_PRODUCTS')
          .get();
      })
    }


  if (request.text.match(/ORDER_TITLE-[\s\S]*/)) {
    console.log('request.title', request.text)
    var pName = request.text.split('-')[1]

    return rp.get('https://trusu.co/collectionapi/products')
      .then((res) => {
        var prods = JSON.parse(res.body)
        var f_prods = prods.filter( prod => {
          // console.log('title', prod.title.toUpperCase())
          // console.log('pName', pName.toUpperCase())
          return prod.supplierEmail == SUPPLIEREMAIL
              && prod.title.toUpperCase() == (pName.toUpperCase())
        })
        // console.log('ORDER_TITLE: f_prods- ', f_prods)
        var template = makeProductTemplate(f_prods)
        return [
          'Sure! Let me pull all packages for ' + pName,
          template.get(),
          new fbTemplate.Button('Want to view more?')
            .addButton('View More', 'https://trusu.co/facebook_auth/suppliers/' + request.sender)
            .get()
        ]
      })

  }

  if (request.text.match(/ORDER_PRODUCT-[\s\S]*/)) {
      console.log('Just ordered ' + request.text);
      var pName = request.text.split('-')[1]
      var pId = request.text.split('-')[2]

      return rp.get('https://trusu.co/collectionapi/products/' + pId)
        .then((res) => {
          var p = JSON.parse(res.body)[0]
          var option = {
                method: 'PUT',
                uri: 'https://trusu.co/collectionapi/bot_sessions/' + request.sender,
                body: {
                    '$set': {
                      'state': 'order-quantity',
                      'poi': JSON.stringify(p)
                    }
                },
                json: true
            };

          rp_nm(option)
          .then(console.log('State changed to order for user ' + request.sender))
          .catch((err) => console.log(err));

          var quan_unit = p.order_unit
          if (p.order_unit == 'unit')
              quan_unit = p.casing_unit

          return [
            'Please specify number of ' + quan_unit + '(s) to order.'
          ]


        })

  }

  if (message_state === 'order-quantity') {

      var q = request.text.match(/\d+/)[0]
      console.log('quantity ordered: ', q)
      var p = JSON.parse(session.poi)
      var shoppingCart = []
      if (session.shoppingCart)
        shoppingCart = JSON.parse(session.shoppingCart)

      shoppingCart.push({'product': p, 'quantity': q})
      // var option = {
      //   method: 'PUT',
      //   uri: 'https://trusu.co/collectionapi/bot_sessions/' + request.sender,
      //   body: {
      //     '$set': {
      //       'state': 'order-message',
      //       'quantity' : q
      //     }
      //   },
      //   json: true
      // };

      var option = {
        method: 'PUT',
        uri: 'https://trusu.co/collectionapi/bot_sessions/' + request.sender,
        body: {
          '$set': {
            'state': 'active',
            'quantity' : '',
            'poi': '',
            'shoppingCart': JSON.stringify(shoppingCart)
          }
        },
        json: true
      };

      rp_nm(option)
      .then(console.log('Order save to cart for user ' + request.sender))
      .catch((err) => console.log(err));

      //return 'Please add extra instructions if needed.'
      return new fbTemplate.Button('Order saved to cart!')
              .addButton('Order More', 'ORDER_PRODUCTS')
              .addButton('View Cart', 'VIEW_CART')
              .addButton('Checkout', 'CHECKOUT')
              .get()
  }

  if (request.text === 'CHECKOUT') {

      var option = {
        method: 'PUT',
        uri: 'https://trusu.co/collectionapi/bot_sessions/' + request.sender,
        body: {
          '$set': {
            'state': 'order-message'
          }
        },
        json: true
      };

      rp_nm(option)
      .then(console.log('Order save to cart for user ' + request.sender))
      .catch((err) => console.log(err));

      return 'Great! Please add extra instructions if needed.'

  }

  if (request.text === 'VIEW_CART') {

    var response = []
    var cart = []
    if (session.shoppingCart)
      cart = JSON.parse(session.shoppingCart)
    cart.forEach(o => {
      response.push('Product: ' + o.product.title + '\n' + 'Quantity:  ' + o.quantity)
    })

    return response

  }

  if (message_state === 'order-message') {

      var message = request.text
      var option = {
        method: 'PUT',
        uri: 'https://trusu.co/collectionapi/bot_sessions/' + request.sender,
        body: {
          '$set': {
            'state': 'active',
            'message' : message
          }
        },
        json: true
      };

      rp_nm(option)
      .then(console.log('State changed to active for user ' + request.sender))
      .catch((err) => console.log(err));

      var response = []
      var cart = JSON.parse(session.shoppingCart)
      cart.forEach(o => {
        response.push('Product: ' + o.product.title + '\n' + 'Quantity:  ' + o.quantity)
      })
      response.push('Special Instructions: ' + message)
      response.push(new fbTemplate.Button('Confirm order?')
                      .addButton('Confirm', 'ORDER_CONFIRM')
                      .get())
      console.log('response', response)
      return response
  }

  if (request.text === 'ORDER_CONFIRM') {

    var shoppingCart = JSON.parse(session.shoppingCart)
    var orders = []
    shoppingCart.forEach(sc => {
      var p = sc.product
      var _tA = p.price * sc.quantity
      var o = {
        productId: p._id,
        quantity: sc.quantity,
        title: p.title,
        supplierEmail: p.supplierEmail,
        supplierId: p.owner,
        buyerEmail: 'test@tester.com', //Change
        owner: session.trusuId, //Change
        currency: p.currency,
        totalAmount: _tA,
        price: p.price
      }
      orders.push(o)
  })

    console.log('orders', orders)
    var orderId = uuidV1();
    var purchaseOrder = {
      "orders": encodeURIComponent(JSON.stringify(orders)),
      "orderId": orderId,
      "supplierId": orders[0].supplierId,
      "owner": session.trusuId,
      "message": session.message
    }

    console.log('Purchase Order', purchaseOrder)

    var options = {
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(purchaseOrder)
    };
    return rp.post('https://trusu.co/collectionapi/purchase_orders', options)
      .then((res) => {

        var option = {
          method: 'PUT',
          uri: 'https://trusu.co/collectionapi/bot_sessions/' + request.sender,
          body: {
            '$set': {
              'state': 'active',
              'quantity' : 1,
              'poi': '',
              'shoppingCart': '',
              'message':''
            }
          },
          json: true
        };

        rp_nm(option)
        .then(console.log('State changed to active for user ' + request.sender))
        .catch((err) => console.log(err));

        return new fbTemplate.Button('Got it! I\'ll process your order.')
          .addButton('Order Again', 'ORDER_PRODUCTS')
          .addButton('View Orders', 'https://trusu.co/facebook_auth/purchase-orders/' + request.sender)
          .get()
      })
      .catch((err)=> {
        return ['Something went wrong submitting your order...']
      })
  }

  if (request.text === 'ORDER_PRODUCTS') {

    var pageId = request.originalRequest.recipient.id
    return rp.get('https://trusu.co/collectionapi/companies')
      .then(res => {
        var companies = JSON.parse(res.body)
        console.log(companies);
        var result = companies.filter(c => c.facebookPageId == pageId)
        var companyPage = result[0]

        return new fbTemplate.Button('Would you like to search for specific product or view all of ' + companyPage.companyName + '\'s products.')
          .addButton('Search', 'SEARCH_PRODUCTS')
          .addButton('View All', 'VIEW_PRODUCTS')
          .get();
      })
      .catch(error => console.log("Error retrieving companies: ", error))
  }

  if (request.text === 'VIEW_PRODUCTS') {

    return rp.get('https://trusu.co/collectionapi/products')
      .then((res) => {
        var prods = JSON.parse(res.body)
        var f_prods = prods.filter( prod =>{
          return prod.supplierEmail == SUPPLIEREMAIL})
        var g_prods = groupBy(f_prods, 'title')
        var template = makeProductTemplate(g_prods)
        return [
          'Sure! Let me pull up your results.',
          template.get(),
          new fbTemplate.Button('Want to view more?')
            .addButton('View More', 'https://trusu.co/facebook_auth/suppliers/' + request.sender)
            .get()
        ]
      })
    }

  if (request.text === 'SEARCH_PRODUCTS') {

    var option = {
          method: 'PUT',
          uri: 'https://trusu.co/collectionapi/bot_sessions/' + request.sender,
          body: {
              '$set': {
                'state': 'search'
              }
          },
          json: true
      };

    return rp_nm(option)
            .then((res) => {
              return ['Which product are you looking for?']
      	     })
            .catch((err) => {
      	       console.log(err)
      	     });
    }

  if (message_state === 'search') {
    var option = {
          method: 'PUT',
          uri: 'https://trusu.co/collectionapi/bot_sessions/' + request.sender,
          body: {
              '$set': {
                'state': 'active'
              }
          },
          json: true
      };

    rp_nm(option)
    .then(console.log('State changed to active for user ' + request.sender))
    .catch((err) => console.log(err));

    return rp.get('https://trusu.co/collectionapi/products')
      .then((res) => {
        var prods = JSON.parse(res.body)

        var f_prods = prods.filter( prod => {
          return prod.supplierEmail == SUPPLIEREMAIL
              && prod.title.toUpperCase().match(request.text.toUpperCase())
        })
        console.log('products returned', f_prods)
        if (f_prods.length == 0){
          return new fbTemplate.Button('I\'m not able to find a match.')
            .addButton('Search Again', 'SEARCH_PRODUCTS')
            .get()
        } else {
          var template = makeProductTemplate(f_prods)
          return [
            'Let me pull up your results.',
            template.get(),
            new fbTemplate.Button('Not what you are looking for?')
              .addButton('Search Again', 'SEARCH_PRODUCTS')
              .get()
            // new fbTemplate.Text('Not what you are looking for?')
            //   .addQuickReply('Search Again', 'SEARCH_PRODUCTS')
            //   .get()
          ]
        }
      })
  }


}

module.exports = botBuilder((request, originalApiRequest) => {

    var session = null
    //token = originalApiRequest.env.facebookAccessToken
    var pageId = request.originalRequest.recipient.id
    token = originalApiRequest.env[pageId]
    console.log('token', token)
    return rp.get('https://trusu.co/collectionapi/bot_sessions/' + request.sender)
      .then((res) => {
        session = JSON.parse(res.body)[0]
        console.log('Bot Session:', session)
        return _constructResponse(request, session )
      })
      .catch((err) => {

        console.log('err', err)
        b = JSON.parse(err.body)
        if (b.message == "No Record(s) Found") {
          console.log('Bot Session for user ' + request.sender + ' not found')
          return _constructResponse(request, session)
        } else
          console.log('Error retrieving user ' + request.sender)
          return 'Something is wrong. I will reply in a bit.'
      })
});
