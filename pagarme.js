LoadCheckoutPaymentContext(function (Checkout, PaymentOptions) {
    let urlApp = "https://nuvemshop-app.mundipagg.com"; // NOSONAR
    let urlToken = "https://api.mundipagg.com/core/v1/tokens"; // NOSONAR

    var installments = null;
    let interest = 1.05;
    let currentCheckoutTotalPrice = Checkout.getData('order.cart.prices.total');

    if (urlApp.includes("stg")) {
        urlToken = "https://stgapi.mundipagg.com/core/v1/tokens"; // NOSONAR
    }

    const nuvemShopErrorCodes = {
        cardNumberInvalid: "card_number_invalid",
        cardHolderNameInvalid: "card_holder_name_invalid",
        cardHolderIdInvalid: "card_holder_id_invalid",
        cardExpirationDateInvalid: "card_expiration_date_invalid",
        cardCVVInvalid: "card_cvv_invalid",
        customerPhoneInvalid: "consumer_phone_invalid",
        shippingStreetInvalid: "shipping_street_invalid",
        consumerStreetInvalid: "consumer_street_invalid",
        shippingCityInvalid: "shipping_city_invalid",
        consumerCityInvalid: "consumer_city_invalid",
        shippingCountryInvalid: "shipping_country_invalid",
        consumerCountryInvalid: "consumer_country_invalid",
        shippingStateInvalid: "shipping_state_invalid",
        consumerStateInvalid: "consumer_state_invalid",
        shippingZipInvalid: "shipping_zip_invalid",
        consumeZipInvalid: "consumer_zip_invalid",
        defaultError: "unknown_error"
    }

    function sendPaymentRequestAndCallback(urlApp, pagarmeOrder, methodConfig, callback) {
        sendPaymentRequest(urlApp, pagarmeOrder, methodConfig, callback)
            .then(jsonResponse => {
                if (jsonResponse.errors !== undefined) {
                    throw jsonResponse.errors[0].message;
                }

                callback({
                    success: true,
                    close: true,
                    confirm: true
                })
            })
            .catch((error) => {
                callback(returnCallbackError(error));
            });
    }

    function sendPaymentRequestAndCallbackForExternalPayment(urlApp, pagarmeOrder, methodConfig, callback) {
        sendPaymentRequest(urlApp, pagarmeOrder, methodConfig, callback)
            .then(jsonResponse => {
                if (jsonResponse.errors !== undefined) {
                    throw jsonResponse.errors[0].message;
                }

                callback({
                    success: true,
                    close: false,
                    extraAuthorized: true,
                    redirect: jsonResponse.payment_url
                })
            })
            .catch((error) => {
                callback(returnCallbackError(error));
            });
    }

    function returnCallbackError(error) {
        return {
            success: false,
            error_code: error ?? nuvemShopErrorCodes.defaultError
        }
    }

    function validateCardInfo(Checkout) {
        if (!validateCardNumber(Checkout.getData('form.cardNumber'))) {
            return {
                isValid: false,
                error_code: nuvemShopErrorCodes.cardNumberInvalid
            }
        }
        if (!validateHolderName(Checkout.getData('form.cardHolderName'))) {
            return {
                isValid: false,
                error_code: nuvemShopErrorCodes.cardHolderNameInvalid
            }
        }
        if (!validateHolderDocument(handleDocumentSpecialCharacters(Checkout.getData('form.cardHolderIdNumber')))) {
            return {
                isValid: false,
                error_code: nuvemShopErrorCodes.cardHolderIdInvalid
            }
        }
        if (!validateCardExpiration(Checkout.getData('form.cardExpiration'))) {
            return {
                isValid: false,
                error_code: nuvemShopErrorCodes.cardExpirationDateInvalid
            }
        }
        if (!validateCardCVV(Checkout.getData('form.cardCvv'))) {
            return {
                isValid: false,
                error_code: nuvemShopErrorCodes.cardCVVInvalid
            }
        }

        if (!validateCustomerPhone(Checkout.getData('order.billingAddress.phone'))) {
            return {
                isValid: false,
                error_code: nuvemShopErrorCodes.customerPhoneInvalid
            }
        }

        let validateShippingAddressResult = validateShippingAddress(Checkout.getData('order.shippingAddress'))
        if (Checkout.getData('order.hasShippableProducts') && validateShippingAddressResult) {
            return validateShippingAddressResult
        }

        let validateBillingAddressResult = validateBillingAddress(Checkout.getData('order.billingAddress'))
        if (validateBillingAddressResult) {
            return validateBillingAddressResult
        }

        return { isValid: true };
    }

    function validateCardNumber(cardNumber) {
        return !(cardNumber === undefined || cardNumber == null || cardNumber.length > 18);
    }

    function validateHolderName(cardHolderName) {
        return !(cardHolderName === undefined || cardHolderName == null);
    }

    function validateHolderDocument(cardHolderDocument) {
        return !(cardHolderDocument === undefined || cardHolderDocument == null || cardHolderDocument.length > 14);
    }

    function validateCustomerPhone(customerPhone) {
        return !(customerPhone === undefined || customerPhone == null || customerPhone.length < 10);
    }

    function validateCardExpiration(cardExpiration) {
        if (cardExpiration === undefined || cardExpiration == null) {
            return false;
        }
        let monthAndYear = cardExpiration.split("/");
        let now = new Date();
        if (monthAndYear[1].length === 2) {
            monthAndYear[1] = `20${monthAndYear[1]}`;
        }
        let cardExpirationDate = new Date(parseInt(monthAndYear[1]), parseInt(monthAndYear[0]) - 1);
        return cardExpirationDate >= now;
    }

    function validateCardCVV(cardCVV) {
        return !(cardCVV === undefined || cardCVV == null || cardCVV.length > 4);
    }

    function returnAddressError(errorCode) {
        return {
            isValid: false,
            error_code: errorCode
        }
    }

    function validateShippingAddress(address) {
        if (!address.address) return returnAddressError(nuvemShopErrorCodes.shippingStreetInvalid)
        if (!address.city) return returnAddressError(nuvemShopErrorCodes.shippingCityInvalid)
        if (!address.country) return returnAddressError(nuvemShopErrorCodes.shippingCountryInvalid)
        if (!address.state) return returnAddressError(nuvemShopErrorCodes.shippingStateInvalid)
        if (!address.zipcode) return returnAddressError(nuvemShopErrorCodes.shippingZipInvalid)
    }

    function validateBillingAddress(address) {
        if (!address.address) return returnAddressError(nuvemShopErrorCodes.consumerStreetInvalid)
        if (!address.city) return returnAddressError(nuvemShopErrorCodes.consumerCityInvalid)
        if (!address.country) return returnAddressError(nuvemShopErrorCodes.consumerCountryInvalid)
        if (!address.state) return returnAddressError(nuvemShopErrorCodes.consumerStateInvalid)
        if (!address.zipcode) return returnAddressError(nuvemShopErrorCodes.consumeZipInvalid)
    }

    function handleDocumentSpecialCharacters(holderDocument) {
        if (holderDocument === undefined || holderDocument == null) {
            return holderDocument;
        }
        return holderDocument.replace(/(\.|-|\/*)/g, "");
    }

    function handleFourDigitsYear(year) {
        if (year === undefined || year == null) {
            return;
        }
        return year.substring(2, 4);
    }

    function createBaseOrderObject(Checkout, methodConfig) {
        let pagarmeItems = Checkout.getData('order.cart.lineItems').map(item => {
            return {
                amount: parseFloat(item.price),
                description: item.name,
                quantity: item.quantity,
                product_id: item.product_id
            };
        });

        let customer = {
            "first_name": Checkout.getData('order.billingAddress.first_name'),
            "last_name": Checkout.getData('order.billingAddress.last_name'),
            "id_number": Checkout.getData('order.billingAddress.id_number'),
            "email": Checkout.getData('order.contact.email'),
            "phone": Checkout.getData('order.billingAddress.phone')
        }

        return {
            "order_id": Checkout.getData('order.cart.id'),
            "code": Checkout.getData('order.cart.id'),
            "payment_providerId": methodConfig.payment_provider_id,
            "items": pagarmeItems,
            "payment": {
                "amount": Checkout.getData('order.cart.prices.total'),
                "installment": (Checkout.getData('form.cardInstallments')) ? Checkout.getData('form.cardInstallments') : 1,
                "shipping": Checkout.getData('order.cart.prices.shipping'),
                "currency": Checkout.getData('order.cart.currency'),
                "success_url": Checkout.getData('callbackUrls.success'),
                "failure_url": Checkout.getData('callbackUrls.failure'),
                "card_brand": ""
            },
            "payment_method_checkout": methodConfig.supported_payment_method_types.toString(),
            "shipping_address": Checkout.getData('order.shippingAddress'),
            "billing_address": Checkout.getData('order.billingAddress'),
            "customer": customer,
            "has_shippable_products": Checkout.getData('order.cart.hasShippableProducts'),
            "shipping_type": Checkout.getData('order.cart.shipping.type')
        }
    }

    async function getCardId(urlToken, publicKey, Checkout) {
        let headers = new Headers();
        headers.append("Accept", "application/json, text/javascript");
        headers.append("Content-Type", "application/json");


        let cardExpiration = Checkout.getData('form.cardExpiration').split("/");
        let raw = JSON.stringify({
            "type": "card",
            "card": {
                "number": Checkout.getData('form.cardNumber'),
                "holder_name": Checkout.getData('form.cardHolderName'),
                "holder_document": handleDocumentSpecialCharacters(Checkout.getData('form.cardHolderIdNumber')),
                "exp_month": cardExpiration[0],
                "exp_year": cardExpiration[1].length === 4 ? handleFourDigitsYear(cardExpiration[1]) : cardExpiration[1],
                "cvv": Checkout.getData('form.cardCvv')
            }
        });

        let requestOptions = {
            method: 'POST',
            headers: headers,
            body: raw,
        };

        return fetch(`${urlToken}?appId=${publicKey}`, requestOptions)
    }

    async function getPublickKey(urlApp, paymentProviderId) {
        const response = await fetch(`${urlApp}/ns-pk/${paymentProviderId}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new publicKeyException();
        }

        return response.json();
    }

    async function getInstallments(urlApp, Checkout, paymentProviderId) {
        const response = await fetch(`${urlApp}/ns-installments/${paymentProviderId}?amount=${Checkout.getData('order.cart.prices.total')}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new installmentsException();
        }

        return response.json();
    }

    let sendPaymentRequest = async function (urlApp, pagarmeOrder, methodConfig, callback) {
        return fetch(`${urlApp}/ns-payments`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-NuvemShop-Api-Payment-Provider': methodConfig.payment_provider_id
            },
            body: JSON.stringify(pagarmeOrder)
        }).then(response => response.json()).catch(() => {
            callback({
                success: false,
                error_code: nuvemShopErrorCodes.defaultError
            });
        });
    };

    let updateInstallmentsAndReturnTotalPrice = async function (urlApp, methodConfig, Checkout, currentCheckoutTotalPrice) {

        let newCheckoutTotalPrice = Checkout.getData('totalPrice');

        if (currentCheckoutTotalPrice !== newCheckoutTotalPrice) {

            let installments = await getInstallments(urlApp, Checkout, methodConfig.payment_provider_id);
            Checkout.setInstallments(installments);

            return newCheckoutTotalPrice;
        }

        return currentCheckoutTotalPrice;
    }

    function installmentsException() {
        this.message = "An error occurred concerning the installments"
        this.name = "installmentsException"
    }

    function publicKeyException() {
        this.message = "An error occurred concerning the public key"
        this.name = "publicKeyException"
    }

    const PagarmeBoletoPayment = new PaymentOptions.Transparent.BoletoPayment({
        id: 'pagarme_payment_boleto',

        onSubmit: function (callback) {
            let pagarmeOrder = createBaseOrderObject(Checkout, this.methodConfig);
            sendPaymentRequestAndCallback(urlApp, pagarmeOrder, this.methodConfig, callback);
        }
    });

    const PagarmeCreditCardPayment = new PaymentOptions.Transparent.CardPayment({
        id: "pagarme_payment_credit_card",

        fields:
        {
            card_holder_id_types: [{
                code: 'CPF',
                name: 'CPF/CNPJ'
            }],
            card_holder_id_number: true
        },

        onLoad: Checkout.utils.throttle(async function (callback) {
            installments = [{ "quantity": 1, "interestFree": false, "installmentAmount": currentCheckoutTotalPrice * interest, "totalAmount": interest * currentCheckoutTotalPrice }, { "quantity": 2, "interestFree": false, "installmentAmount": currentCheckoutTotalPrice * interest / 2, "totalAmount": interest * currentCheckoutTotalPrice }, { "quantity": 3, "interestFree": false, "installmentAmount": currentCheckoutTotalPrice * interest / 3, "totalAmount": interest * currentCheckoutTotalPrice }, { "quantity": 4, "interestFree": false, "installmentAmount": currentCheckoutTotalPrice * interest / 4, "totalAmount": interest * currentCheckoutTotalPrice }, { "quantity": 5, "interestFree": false, "installmentAmount": currentCheckoutTotalPrice * interest / 5, "totalAmount": interest * currentCheckoutTotalPrice }, { "quantity": 6, "interestFree": false, "installmentAmount": currentCheckoutTotalPrice * interest / 6, "totalAmount": interest * currentCheckoutTotalPrice }, { "quantity": 7, "interestFree": false, "installmentAmount": currentCheckoutTotalPrice * interest / 7, "totalAmount": interest * currentCheckoutTotalPrice }, { "quantity": 8, "interestFree": false, "installmentAmount": currentCheckoutTotalPrice * interest / 8, "totalAmount": interest * currentCheckoutTotalPrice }, { "quantity": 9, "interestFree": false, "installmentAmount": currentCheckoutTotalPrice * interest / 9, "totalAmount": interest * currentCheckoutTotalPrice }, { "quantity": 10, "interestFree": false, "installmentAmount": currentCheckoutTotalPrice * interest / 10, "totalAmount": interest * currentCheckoutTotalPrice }, { "quantity": 11, "interestFree": false, "installmentAmount": currentCheckoutTotalPrice * interest / 11, "totalAmount": interest * currentCheckoutTotalPrice }, { "quantity": 12, "interestFree": false, "installmentAmount": currentCheckoutTotalPrice * interest / 12, "totalAmount": interest * currentCheckoutTotalPrice }];
            Checkout.setInstallments(installments);
        }),

        onDataChange: Checkout.utils.throttle(async function () {
            let newCheckoutTotalPrice = Checkout.getData('totalPrice');

            currentCheckoutTotalPrice = newCheckoutTotalPrice

            installments = [{ "quantity": 1, "interestFree": false, "installmentAmount": currentCheckoutTotalPrice * interest, "totalAmount": interest * currentCheckoutTotalPrice }, { "quantity": 2, "interestFree": false, "installmentAmount": currentCheckoutTotalPrice * interest / 2, "totalAmount": interest * currentCheckoutTotalPrice }, { "quantity": 3, "interestFree": false, "installmentAmount": currentCheckoutTotalPrice * interest / 3, "totalAmount": interest * currentCheckoutTotalPrice }, { "quantity": 4, "interestFree": false, "installmentAmount": currentCheckoutTotalPrice * interest / 4, "totalAmount": interest * currentCheckoutTotalPrice }, { "quantity": 5, "interestFree": false, "installmentAmount": currentCheckoutTotalPrice * interest / 5, "totalAmount": interest * currentCheckoutTotalPrice }, { "quantity": 6, "interestFree": false, "installmentAmount": currentCheckoutTotalPrice * interest / 6, "totalAmount": interest * currentCheckoutTotalPrice }, { "quantity": 7, "interestFree": false, "installmentAmount": currentCheckoutTotalPrice * interest / 7, "totalAmount": interest * currentCheckoutTotalPrice }, { "quantity": 8, "interestFree": false, "installmentAmount": currentCheckoutTotalPrice * interest / 8, "totalAmount": interest * currentCheckoutTotalPrice }, { "quantity": 9, "interestFree": false, "installmentAmount": currentCheckoutTotalPrice * interest / 9, "totalAmount": interest * currentCheckoutTotalPrice }, { "quantity": 10, "interestFree": false, "installmentAmount": currentCheckoutTotalPrice * interest / 10, "totalAmount": interest * currentCheckoutTotalPrice }, { "quantity": 11, "interestFree": false, "installmentAmount": currentCheckoutTotalPrice * interest / 11, "totalAmount": interest * currentCheckoutTotalPrice }, { "quantity": 12, "interestFree": false, "installmentAmount": currentCheckoutTotalPrice * interest / 12, "totalAmount": interest * currentCheckoutTotalPrice }];

            Checkout.setInstallments(installments);
        }, 100),

        onSubmit: async function (callback) {

            let pagarmeOrder = createBaseOrderObject(Checkout, this.methodConfig);
            pagarmeOrder.payment.amount = Checkout.getData('totalPrice');

            let isCardInfoValidObject = validateCardInfo(Checkout);
            if (!isCardInfoValidObject.isValid) {
                callback({
                    success: false,
                    error_code: isCardInfoValidObject.error_code
                })
                return;
            }

            const publicKey = await getPublickKey(urlApp, this.methodConfig.payment_provider_id);
            let cardObject = await getCardId(urlToken, publicKey.value, Checkout);
            if (!cardObject.ok) {
                callback({
                    success: false,
                    error_code: "card_info_invalid"
                });
                return;
            }

            cardObject = await cardObject.json();

            pagarmeOrder.card_token = cardObject.id;
            pagarmeOrder.payment.card_brand = cardObject.card.brand;

            sendPaymentRequestAndCallback(urlApp, pagarmeOrder, this.methodConfig, callback);
        }
});

const PagarmeExternalPayment = new PaymentOptions.ExternalPayment({
    id: "pagarme_payment_external",

    onSubmit: function (callback) {
        let pagarmeOrder = createBaseOrderObject(Checkout, this.methodConfig);

        pagarmeOrder.payment_method_checkout = "checkout"

        sendPaymentRequestAndCallbackForExternalPayment(urlApp, pagarmeOrder, this.methodConfig, callback);
    },
});

const PagarmePixPayment = new PaymentOptions.Transparent.PixPayment({
    id: 'pagarme_payment_pix',

    onSubmit: function (callback) {
        let pagarmeOrder = createBaseOrderObject(Checkout, this.methodConfig);
        sendPaymentRequestAndCallback(urlApp, pagarmeOrder, this.methodConfig, callback);
    }
});

Checkout.addPaymentOption(PagarmeCreditCardPayment);
Checkout.addPaymentOption(PagarmeBoletoPayment);
Checkout.addPaymentOption(PagarmeExternalPayment);
Checkout.addPaymentOption(PagarmePixPayment);
});
