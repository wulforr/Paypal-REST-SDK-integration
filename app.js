let express = require("express")
let app = express();
let bodyparser = require("body-parser");
let paypal = require("paypal-rest-sdk");
var nodemailer = require('nodemailer');


paypal.configure({
    'mode': 'sandbox', //sandbox or live
    'client_id': 'AayywB69N_f2QSuZFHaSh5Z9BpnIk4QViybYrmWFoehO5XXi11cY4v_hbcN3JpBeZ12tYHmQOW8ZgXGj',
    'client_secret': 'EOJ5UAF_LQkjWDG090tTwi7q-GIip2GhnKai6lhkgucFGdTayh2_uU-ArFiO6uZksQ7nexMBqikMJlYx'
  });

app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));

app.use(express.static("public"));

app.get("/",(req,res) => {
    res.render("index.ejs");
})


app.get("/pay",(req,res)=>{

    res.render("pay.ejs");
})

app.post("/payment",(req,res,next)=>{

    let url = "/" + req.body.paytype + "-pay";
    res.redirect(307,url);
})

app.post("/paypal-pay",(req,res) => {
    console.log(req);
    const create_payment_json = {
        "intent": "sale",
        "payer": {
            "payment_method": "paypal"
        },
        "redirect_urls": {
            "return_url": "https://payment-gatewayyy.herokuapp.com/success",
            "cancel_url": "https://payment-gatewayyy.herokuapp.com/cancel"
        },
        "transactions": [{
            "item_list": {
                "items": [{
                    "name": "Donation",
                "sku": "item",
                "price": req.body.amount,
                "currency": "USD",
                "quantity": 1
                }]
            },
            "amount": {
                "currency": "USD",
                "total": req.body.amount
            },
            "description": "The Donation that you are doing"
        }]
    };
    paypal.payment.create(create_payment_json, function (error, payment) {
        if (error) {
            throw error;
        } else {
            console.log(payment);
            payment.links.forEach(url => {
                if(url.rel === "approval_url"){
                    res.redirect(url.href);
                }
            });
        }
    });
    })


    app.get("/success",(req,res)=>{
        console.log(req.body);
        const payerId = req.query.PayerID;
        const paymentId = req.query.paymentId;

        const execute_payment_json = {
            "payer_id" : payerId,
            /*"transactions": [{
                    "amount": {

                    }
                }]*/
            }

            paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
                if (error) {
                    console.log(error.response);
                    throw error;
                } else {
                    console.log(JSON.stringify(payment));
                    let amountPaid = payment.transactions[0].amount.total;
                    let currency = payment.transactions[0].amount.currency;
                    let name = payment.payer.payer_info.first_name + payment.payer.payer_info.last_name;
                    let email = payment.payer.payer_info.email;
                    

                    nodemailer.createTestAccount((err, account) => {
                        if (err) {
                            console.error('Failed to create a testing account. ' + err.message);
                            return process.exit(1);
                        }
                    
                        console.log('Credentials obtained, sending message...');
                    
                        // Create a SMTP transporter object
                        let transporter = nodemailer.createTransport({
                            host: account.smtp.host,
                            port: account.smtp.port,
                            secure: account.smtp.secure,
                            auth: {
                                user: account.user,
                                pass: account.pass
                            }
                        });
                    
                        // Message object
                        let message = {
                            from: 'Sender Name <sender@example.com>',
                            to: 'Recipient <recipient@example.com>',
                            subject: "donated" + amountPaid+" " + currency, // Subject line
                          text: "Thank you "+name+ "for donating" + amountPaid + " " + currency + " to our organization", // plain text body
                        }
                        transporter.sendMail(message, (err, info) => {
                            if (err) {
                                console.log('Error occurred. ' + err.message);
                                return process.exit(1);
                            }
                    
                            console.log('Message sent: %s', info.messageId);
                            // Preview only available when sending through an Ethereal account
                            console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));

                            res.render("success.ejs",{amount: amountPaid, currency: currency, name: name,email: email,previewmaail: nodemailer.getTestMessageUrl(info)});
                        });
                    });


            }
        });
    })

    app.get("/cancel",(req,res)=>{
        res.send("cancelled");
    })

    app.get("/cancel",(req,res) => {
        console.log(req.body);
        res.send("error cannot process");
    } )
app.listen(process.env.PORT || 3000 , () => console.log("server started"));