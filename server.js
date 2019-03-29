 var express = require('express');
 var path = require('path');
 var graphqlHTTP = require('express-graphql');
 var jwt = require('express-jwt');
 const fileUpload = require('express-fileupload');
 const auth = require('./utils/login');
 const bodyParser = require('body-parser');
 const globals = require('./config/globals');
 const JOIN = require('./utils/join-models');

 var {
   buildSchema
 } = require('graphql');
 var mergeSchema = require('./utils/merge-schemas');
 var acl = null;

 var cors = require('cors');


 /* Server */
 const APP_PORT = globals.PORT;
 const app = express();

 app.use((req, res, next)=> {

 // Website you wish to allow to connect
 res.setHeader('Access-Control-Allow-Origin', globals.ALLOW_ORIGIN);
 //res.setHeader('Access-Control-Expose-Headers', 'Access-Control-Allow-Origin');

 // Request methods you wish to allow
 //res.setHeader('Access-Control-Allow-Methods',
 //  'GET, POST, OPTIONS, PUT, PATCH, DELETE');

 // Request headers you wish to allow
 //res.setHeader('Access-Control-Allow-Headers',
 //  'X-Requested-With,content-type,authorization,Authorization,accept,Accept');
   next();
 });

 /* Temporary solution:  acl rules set */
 if (process.argv.length > 2 && process.argv[2] == 'acl') {
   var node_acl = require('acl');
   var {
     aclRules
   } = require('./acl_rules');
   var acl = new node_acl(new node_acl.memoryBackend());

   /* set authorization rules from file acl_rules.js */
   acl.allow(aclRules);
   console.log("Authoization rules set!");

   app.use(jwt({ secret: 'something-secret'}).unless({path: ['/login']}));
 } else {
   console.log("Open server, no authorization rules");
 }

 /* Schema */
 console.log('Merging Schema');
 var merged_schema = mergeSchema(path.join(__dirname, './schemas'));
 console.log(merged_schema);
 var Schema = buildSchema(merged_schema);

 /* Resolvers*/
 var resolvers = require('./resolvers/index');




app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use('/login', cors(), (req, res)=>{

  auth.login(req.body).then( (token) =>{
    res.json({token: token});
  }).catch((err) =>{
    console.log(err);
    res.status(500).send({error: "Wrong email or password. Please check your credentials."})
  });

});




app.use('/join', cors(), (req, res) => {

    // check if the Content-Type is in JSON so that bodyParser can be applied automatically
    if (!req.is('application/json'))
        return res.status(415).send({error: "JSON Content-Type expected"});

    let context = {
        request: req,
            acl: acl
    };

    let joinModels = new JOIN.JoinModelsJSON(context);

    joinModels.run(req.body, res).then(() => {
        res.end();
    }).catch(error => {
        let formattedError = {
            message: error.message,
            details: error.originalError && error.originalError.errors ? error.originalError.errors : "",
            path: error.path
        };
        res.status(500).send(formattedError);
    });
});










 app.use(fileUpload());
 /*request is passed as context by default  */
 app.use('/graphql', cors(), graphqlHTTP((req) => ({
   schema: Schema,
   rootValue: resolvers,
   pretty: true,
   graphiql: true,
   context: {
     request: req,
     acl: acl
   },
   formatError(error){
     return {
       message: error.message,
       details: error.originalError && error.originalError.errors ? error.originalError.errors : "",
       path: error.path
     };
   }
 })));

 // Error handling
 app.use(function (err, req, res, next) {
     if (err.name === 'UnauthorizedError') { // Send the error rather than to show it on the console
         res.status(401).send(err);
     }
     else {
         next(err);
     }
 });

 var server = app.listen(APP_PORT, () => {
   console.log(`App listening on port ${APP_PORT}`);
 });

 module.exports = server;
