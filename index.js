const ejs = require('ejs');
const TonWeb = require('tonweb');
const bodyParser = require("body-parser");
const express=require('express');
const app = express();
const http = require('http').createServer(app);

// webserver port
const PORT = process.env.PORT || 3000
const PAYMENT = process.env.PAYMENT || 0.01

// Optional: HCaptcha
const captcha={
    type: "HCaptcha",
    secretkey : process.env.HCaptcha_secretkey,
    sitekey: process.env.HCaptcha_sitekey
}

this.config = {};

// Read config
try{
    var config = require('./config.json');
    if(config.status=="uninitialized"){
        new_wallet(1,config).then(function(r){
            process.exit(0);
        });
    }
}catch(e){
    // Create new wallet and wait user action
    new_wallet(0,{}).then(function(r){
        process.exit(0);
    });
}

app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());
app.use(express.static('public'));

// Index page
app.get('/', function(req, res){
    var data = {address: config.address, error: "", ok: "", payment: PAYMENT,captcha:captcha};
    res.render(__dirname + '/index.ejs', data);
});

// Post request
app.post('/',function(req,res){
    if(!req.get('User-Agent'))//Funny bot detection
        res.send('GO AWAY BOT');

    // If captcha enabled
    if(captcha.secretkey){
        const {verify} = require('hcaptcha');
        if(req.body['h-captcha-response']==='' || typeof(req.body['h-captcha-response']) == "undefined" || req.body['h-captcha-response']==null){ //handle empty captcha
            wrong_captcha('You didn`t click it lol.');
        }else{
        verify(captcha.secretkey, req.body['h-captcha-response'])
        .then(function(data){ if(data.success===true)not_bot(); else wrong_captcha();})
        .catch((data) => wrong_captcha());
        }
    }else
        not_bot();  // Continue without captcha

    function not_bot(){
        // sending grams
        send_gramms(req.body.wallet, PAYMENT).then(function(sended){
        if(sended===true){
            var data = {address: config.address, error: "", ok: req.body.wallet, payment: PAYMENT, captcha:captcha};
            const fs = require('fs');
            fs.appendFileSync('payments.txt', '\r\n'+Date.now()+' to '+req.body.wallet+' '+PAYMENT+' GRAM '+req.connection.remoteAddress+' '+req.get('User-Agent'));
        }else
            var data = {address: config.address, error: "Grams not sent: "+sended, ok: "", payment: PAYMENT, captcha:captcha};

        //console.log(req.body.wallet);
        res.render(__dirname + '/index.ejs', data);
    });
    }
    function wrong_captcha(data=''){
        var data = {address: config.address, error: "Wrong captcha (are you a bot??) "+data, ok: "", payment: PAYMENT, captcha:captcha};
        res.render(__dirname + '/index.ejs', data);
    }
});

// Admin template
// TODO
app.get('/admin', function(req, res){
    var fs = require('fs');
    var contents = fs.readFileSync('payments.txt', 'utf8');
    res.send(contents);
});

// Explorer
// TODO
app.get('/explorer', function(req, res){
    var data = {address: config.address, error: "", ok: "", payment: PAYMENT, captcha:captcha};
    res.render(__dirname + '/explorer.ejs', data);
});

// Starting webserver
http.listen(PORT, function(){
    console.log('listening on *:'+PORT);
});

// Function to send grams
async function send_gramms(addr, amount) {
    try {
    const PubK=Uint8Array.from(config.PublicKey);
    const SecK=Uint8Array.from(config.SecretKey);

    const tonweb = new TonWeb();
        
    let wallet = tonweb.wallet.create({publicKey: PubK});
    
    const address = await wallet.getAddress();

    console.log("Your address: "+address.toString(true,true));

    var balance = await tonweb.getBalance(address);
    console.log("Balance: "+balance);
    
    const seqno = await wallet.methods.seqno().call();

    const transfer = wallet.methods.transfer({
        secretKey: SecK,
        toAddress: addr,
        amount: TonWeb.utils.toNano(amount), // Gram amount
        seqno: seqno,
        payload: '\xF0\x9F\x98\x81 TON GRAM Faucet', // Message
        sendMode: 3,
    });

    //const transferFee = await transfer.estimateFee(); 
    //console.log(transferFee);
    const transferSended = await transfer.send();  // send transfer query to blockchain
    //console.log(transferSended);
    if(transferSended && transferSended['@type']=='ok'){
        console.log('Grams sent');
        return true;
    }else{
        return false;
    }

    } catch(e) {
        console.log('Error',e);
        return e;
    }
}


async function new_wallet(step=0, conf={}) {
    try {
        const nacl = TonWeb.utils.nacl; // use nacl library for key pairs
        const tonweb = new TonWeb();
        
        //First step: creating wallet
        if(step == 0){
            console.log("step 1");
            const keyPair = nacl.sign.keyPair(); // create new random key pair
            let wallet = tonweb.wallet.create({publicKey: keyPair.publicKey}); // create interface to wallet smart contract (wallet v3 by default)
            const address = await wallet.getAddress();

            console.log("Public Key ",keyPair.publicKey);
            console.log("Secret Key ",keyPair.secretKey);
            console.log("Your address: "+address.toString(true,true));
            
            let info = await tonweb.provider.getAddressInfo(address.toString(true,true));

            //Creating config
            var config = {
                "address": address.toString(true,true),
                "status": info.state,
                "PublicKey": Object.values(keyPair.publicKey),
                "SecretKey": Object.values(keyPair.secretKey)
            };
            // Writing config
            var fs = require('fs');
            fs.writeFileSync('./config.json', JSON.stringify(config), 'utf8');
            if(info.balance==0 && info.state=='uninitialized'){
                console.log("You MUST send some GRAMS to address "+address.toString(true,true)+" and then restart script.");
            }
        // Second step: initialize wallet. It must have grams
        }else if(step == 1){
            const PubK=Uint8Array.from(Object.values(conf.PublicKey));
            const SecK=Uint8Array.from(Object.values(conf.SecretKey));
            let wallet = tonweb.wallet.create({publicKey: PubK});
            const address = await wallet.getAddress();
            
            var info = await tonweb.provider.getAddressInfo(address.toString(true,true));

            if(info.balance>0){
                let deploy = await wallet.deploy(SecK).send(); // initializing wallet.
                console.log(deploy);
                var info = await tonweb.provider.getAddressInfo(address.toString(true,true));
                if(info.state=='active'){
                    // Update config
                    var config = {
                        "address": address.toString(true,true),
                        "status": info.state,
                        "PublicKey": PubK,
                        "SecretKey": SecK
                    };
                    // Writing config
                    var fs = require('fs');
                    fs.writeFileSync('./config.json', JSON.stringify(config), 'utf8');

                    console.log("Wallet is active now");

                }else
                console.log("Wallet is not active. Something went wrong");
            }else
                console.log("You MUST send some grams to this wallet: "+address.toString(true,true));
        }


    } catch(e) {
        console.log('Error',e);
    }
}

