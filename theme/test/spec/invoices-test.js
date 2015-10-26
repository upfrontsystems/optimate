describe('Invoices page', function() {
    var order_data = {};
    var projectname = 'TestProject';

    function getOrderId(order_data) {
        browser.get('http://127.0.0.1:8000/#/orders');
        element.all(by.repeater('obj in jsonorders')).filter(function(row) {
            return row.getText().then(function(txt) {
                txt = txt.replace(/\s/g, '');
                var found = txt.split(projectname);
                return found.length > 1;
            });
        }).then(function(elem){
            elem[0].getText().then(function(text){
                order_data.orderid = text.split(" ")[0];
            });
        })
    }
    beforeEach(function () {
        browser.get('http://127.0.0.1:8000/#/invoices');
    });

    // tests it's on the invoices page
    it('should be on the invoices page', function() {
        expect(browser.driver.getCurrentUrl()).toBe('http://127.0.0.1:8000/#/invoices');
    });

    it('should find the test order number', function(){
        // find the test order number
        getOrderId(order_data);
    });

    // add an invoice
    it('should add an invoice', function(){
        // open the add invoice modal and fill in the form
        var addInvoiceModal = element(by.id('saveInvoiceModal'));
        element(by.css('nav ul li a i.fa-plus-square')).click();
        expect(addInvoiceModal.isDisplayed()).toBe(true);

        addInvoiceModal.element(by.model('formData.InvoiceNumber')).sendKeys('A10000');
        var selectButton = addInvoiceModal.element(by.css('div.ui-select-container'));
        var selectInput = selectButton.element(by.css('.ui-select-search'));
        // click to open select
        addInvoiceModal.element(by.css('div.ui-select-container div.ui-select-match span.ui-select-input')).click();
        // send text
        selectInput.sendKeys(order_data.orderid);
        browser.waitForAngular();
        // select first element
        element.all(by.css('.ui-select-choices-row-inner span')).first().click();

        addInvoiceModal.element(by.model('formData.Amount')).clear().sendKeys('80');

        addInvoiceModal.element(by.buttonText('Save')).click();
        browser.waitForAngular();
        // check the invoice was added
       element(by.repeater('obj in jsoninvoices').row(0).column('obj.InvoiceNumber')).getText().then(function(name){
            expect(name).toBe('A10000');
       });
    });
});
