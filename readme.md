# [TON Faucet](https://ton-faucet.herokuapp.com/ "ton-faucet.herokuapp.com")

A Node.JS faucet app for Telgram Open Network testnet. Made using [tonweb](https://github.com/toncenter/tonweb "tonweb").

Working faucet: 💎 [ton-faucet.herokuapp.com](https://ton-faucet.herokuapp.com/ "ton-faucet.herokuapp.com")

Author: Alex B (t.me/alexbsoft)


## Features

- Automatic wallet creation and initialization
- Customizable payments
- HCaptcha support (optional)
- Integrated explorer
- Success transaction notification
- (TODO) payment limits per wallet/IP
- (TODO) admin interface
- (TODO) multiple faucet wallets

## Installation

After first run of app you will need to initialize Faucet wallet. Or you can manually enter wallet keys to config.json.

How to initialize wallet?
App will create config.json with wallet data. You just need to send GRAM to this wallet address. And then restart the app. Wallet will be deployed automatically if it has funds. Follow the instructions in the console.

## Configuration

** ENV variables**

 - `PORT` - webserver port
 - `PAYMENT` - payment amount (GRAM)
 - `HCaptcha_secretkey`  (Optional) provide if you want to enable HCaptcha
 - `HCaptcha_sitekey`  (Optional)

**config.json**

If this file does not exist, it will be generated automatically.
Besides, it can be created manually. You need to generate wallet and provide its data: address, status ("active"), PublicKey (Uint8Array), SecretKey (Uint8Array)

```json
{
    "address": "UQAMPdBlavu7gq-VGoqK93gd88L9t74WYsBnR1_NJSMh1noh",
    "status": "active",
    "PublicKey": [123, 123, 123 ],
    "SecretKey": [123, 123, 123]
}
```