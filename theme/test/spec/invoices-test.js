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
        addInvoiceModal.element(by.css('div.ui-select-container div.ui-select-match span.ui-select-input')).click();
        addInvoiceModal.element(by.model('formData.selected')).sendKeys(5903);
        browser.waitForAngular();

        var until = browser.ExpectedConditions;
        browser.wait(function() {
          return browser.isElementVisible(addInvoiceModal.element(by.css('ul.ui-select-choices')));
        }, 30000);
        // browser.wait(until.presenceOf(addInvoiceModal.element(by.css('ul.ui-select-choices'))), 5000, 'Element taking too long to appear in the DOM');
        browser.wait(element(by.id('ui-select-choices-row-2-0')).isPresent);
        addInvoiceModal.element(by.id('ui-select-choices-row-2-0')).click();
        addInvoiceModal.element(by.model('formData.Amount')).sendKeys('500');
        addInvoiceModal.element(by.model('formData.VAT')).sendKeys('50');

        addInvoiceModal.element(by.buttonText('Save')).click();
        browser.waitForAngular();
        // check the invoice was added
       element(by.repeater('obj in jsoninvoices').row(0).column('obj.InvoiceNumber')).getText().then(function(name){
            expect(name).toBe('A10000');
       });
    });
});
