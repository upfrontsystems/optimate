// run test on the projects page
describe('Clean up tests', function () {

    var getTableElements = function(text) {
                    return element.all(by.cssContainingText('td.ng-binding', text))
                };

    var deleteResult = function(name) {
        return getTableElements(name).then(function(found) {
            found[0].click();
            element(by.css('nav ul li a i.fa-trash')).click();
            element(by.buttonText('Delete')).click();
        });
    };

    // login
    it('should log in', function () {
        browser.get('http://127.0.0.1:8000/#/login');
        browser.driver.findElement(protractor.By.id('userName')).sendKeys('admin');
        browser.driver.findElement(protractor.By.id('userPassword')).sendKeys('admin');
        browser.driver.findElement(protractor.By.id("signinButton")).click();
    });

    it('should delete the added payment', function(){
        browser.get('http://127.0.0.1:8000/#/payments');
        // click the payment
        element(by.repeater('obj in jsonpayments').row(0)).click();
        // delete
        element(by.css('nav ul li a i.fa-trash')).click();
        element(by.buttonText('Delete')).click();
    });

    it('should delete the added claim', function () {
        browser.get('http://127.0.0.1:8000/#/claims');
        // click the claim
        element(by.repeater('obj in jsonclaims').row(0)).click();
        // delete
        element(by.css('nav ul li a i.fa-trash')).click();
        element(by.buttonText('Delete')).click();
    });

    it('should delete the added valuation', function () {
        browser.get('http://127.0.0.1:8000/#/valuations');
        element(by.repeater('obj in jsonvaluations').row(0)).click();
        // delete
        element(by.css('nav ul li a i.fa-trash')).click();
        element(by.buttonText('Delete')).click();
    });

    it('should delete the added invoice', function () {
        browser.get('http://127.0.0.1:8000/#/invoices');
        // click the invoice
        element(by.repeater('obj in jsoninvoices').row(0)).click();
        // delete
        element(by.css('nav ul li a i.fa-trash')).click();
        element(by.buttonText('Delete')).click();
    });

    it('should delete the added order', function () {
        browser.get('http://127.0.0.1:8000/#/orders');
        // select the order
        element(by.repeater('obj in jsonorders').row(0)).click();
        expect(element(by.css('nav ul li a i.fa-trash')).isDisplayed()).toBe(true);
        element(by.css('nav ul li a i.fa-trash')).click();

        // check the confirmation modal
        expect(element(by.css('div.modal:nth-child(4) > div:nth-child(1) > div:nth-child(1)')).isDisplayed()).toBe(true);
        element(by.css('div.modal:nth-child(4) > div:nth-child(1) > div:nth-child(1)')).element(by.buttonText('Delete')).click();
    });

    it('should delete the added project', function () {
        browser.get('http://127.0.0.1:8000/#/projects');
        // select the project
        element(by.id('left')).element(by.buttonText('TestProject')).click();
        expect(element(by.css('nav ul li a i.fa-trash')).isDisplayed()).toBe(true);
        element(by.css('nav ul li a i.fa-trash')).click();

        // check the confirmation modal
        expect(element(by.css('div.modal:nth-child(4) > div:nth-child(1) > div:nth-child(1)')).isDisplayed()).toBe(true);
        element(by.css('div.modal:nth-child(4) > div:nth-child(1) > div:nth-child(1)')).element(by.buttonText('Delete')).click();

        // check the project has been deleted
        expect(element(by.id('left')).element(by.buttonText('TestProject')).isPresent()).toBe(false);
    });

    it('should delete the added client', function(){
        browser.get('http://127.0.0.1:8000/#/clients');

        deleteResult('TestClient');
    });

    it('should delete the added supplier', function(){
        browser.get('http://127.0.0.1:8000/#/suppliers');

        deleteResult('TestSupplier');
    });

    it('should delete the added city', function(){
        browser.get('http://127.0.0.1:8000/#/cities');

        deleteResult('TestCity');
    });

    it('should delete the added unit', function(){
        browser.get('http://127.0.0.1:8000/#/units');

        deleteResult('TestUnit');

    });

    it('should delete the added user', function(){
        browser.get('http://127.0.0.1:8000/#/users');

        // get the unit
        element.all(by.repeater('obj in users')).filter(function(row) {
            return row.getText().then(function(txt) {
                return (txt.indexOf('TestUser') > -1);
            });
        }).then(function(elem){
            // click it
            elem[0].click();
            element(by.css('nav ul li a i.fa-trash')).click();
            element(by.buttonText('Delete')).click();
        });
    });
});
