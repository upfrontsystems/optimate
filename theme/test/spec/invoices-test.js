describe('Invoices page', function() {
    beforeEach(function () {
        browser.get('http://127.0.0.1:8000/#/invoices');
    });

    // tests its on the invoices page
    it('should be on the invoices page', function() {
        expect(browser.driver.getCurrentUrl()).toBe('http://127.0.0.1:8000/#/invoices');
    });

    // add an invoice
    it('should add an invoice', function(){
        // open the add invoice modal and fill in the form
        var addInvoiceModal = element(by.id('saveInvoiceModal'));
        element(by.css('nav ul li a i.fa-plus-square')).click();
        expect(addInvoiceModal.isDisplayed()).toBe(true);

        addInvoiceModal.element(by.model('formData.InvoiceNumber')).sendKeys('A10000');
        addInvoiceModal.element(by.id('inputOrderNumber')).sendKeys(59);
        browser.waitForAngular();
        addInvoiceModal.element(by.css('ul.ui-select-choices ui-select-choices-inner')).click();
        addInvoiceModal.element(by.model('formData.Amount')).sendKeys('500');
        addInvoiceModal.element(by.model('formData.VAT')).sendKeys('50');

        addInvoiceModal.element(by.buttonText('Save')).click();

        // check the invoice was added
       element(by.repeater('obj in jsoninvoices').row(0).column('obj.InvoiceNumber')).getText().then(function(name){
            expect(name).toBe('A10000');
       });
    });
});
