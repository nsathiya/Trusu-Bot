const botBuilder = require('claudia-bot-builder')
const rp = require('minimal-request-promise')
const rp_nm = require('request-promise');

const SUPPLIEREMAIL ='shaheen@bestbevhk.com'

const makeProductTemplate = (products) => {
  var template = new fbTemplate.Generic();
  var i = 0;
  products.forEach( p => {
    if (i < 10) {
      i++
      var desc = p.description.substring(0,50)
      return template.addBubble(p.title, desc + '\n' + p.price + ' ' + p.currency)
        .addImage('https://trusu.co/cfs/files/Attachments/' + p.picture)
        .addButton('Order', 'ORDER-' + p.title + '-' + p._id)
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
  console.log('groupProducts', groupProducts)
}

var token = ''

const testGetProducts = () => {

  rp.get('https://trusu.co/collectionapi/products')
    .then((res) => {
      var prods = JSON.parse(res.body)
      var f_prods = prods.filter( prod => {
        return prod.supplierEmail == SUPPLIEREMAIL
      })
      groupBy(f_prods, 'title')
    })
}

//testGetProducts();

const testPrompt = () =>{
  return Promise.resolve().then(() => {
    return prompt(["hi?"]);
  })
  .then(results => {
    console.log(results)
  })
}

testPrompt();
