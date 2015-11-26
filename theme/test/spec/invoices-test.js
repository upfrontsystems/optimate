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
        addInvoiceModal.element(by.model('formData.VAT')).clear().sendKeys('20');

        addInvoiceModal.element(by.buttonText('Save')).click();
        browser.waitForAngular();
        // check the invoice was added
       element(by.repeater('obj in jsoninvoices').row(0).column('obj.InvoiceNumber')).getText().then(function(name){
            expect(name).toBe('A10000');
       });
    });

    it('should edit an invoice', function(){
        element(by.repeater('obj in jsoninvoices').row(0)).click();
        element(by.css('nav ul li a i.fa-pencil')).click();

        var addInvoiceModal = element(by.id('saveInvoiceModal'));
        expect(addInvoiceModal.isDisplayed()).toBe(true);

        addInvoiceModal.element(by.css('#amountsTable > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(3) > td:nth-child(2)')
            ).getText().then(function(total){
                expect(total).toBe('R100.00');
        });

        addInvoiceModal.element(by.model('formData.Amount')).clear().sendKeys('50');

        addInvoiceModal.element(by.css('#amountsTable > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(3) > td:nth-child(2)')
            ).getText().then(function(total){
                expect(total).toBe('R70.00');
        });

        addInvoiceModal.element(by.buttonText('Update')).click();
    });


    it('should submit an invoice', function(){
        element(by.repeater('obj in jsoninvoices').row(0)).click();
        element(by.css('nav ul li a i.fa-arrow-right')).click();
        // check it was processed
        element(by.repeater('obj in jsoninvoices').row(0).column('obj.Status')).getText().then(function(name){
            expect(name).toBe('Due');
        });
    });

    it('should pay an invoice', function(){
        element(by.repeater('obj in jsoninvoices').row(0)).click();
        element(by.css('nav ul li a i.fa-arrow-right')).click();
        // check it was paid
        element(by.repeater('obj in jsoninvoices').row(0).column('obj.Status')).getText().then(function(name){
            expect(name).toBe('Paid');
        });
    });

    it('should view a paid invoice', function(){
        element(by.repeater('obj in jsoninvoices').row(0)).click();
        element(by.css('.navbar-left > li:nth-child(3) > a:nth-child(1)')).click();
        // check it cant be edited
        var addModal = element(by.id('viewInvoiceModal'));
        expect(addModal.element(by.buttonText('Close')).isDisplayed()).toBe(true);

        addModal.element(by.buttonText('Close')).click();
    });

    it('should revert an invoice', function(){
        element(by.repeater('obj in jsoninvoices').row(0)).click();
        element(by.css('nav ul li a i.fa-arrow-left')).click();
        // check it was reverted
        element(by.repeater('obj in jsoninvoices').row(0).column('obj.Status')).getText().then(function(name){
            expect(name).toBe('Due');
        });
    });

    it('should revert an invoice', function(){
        element(by.repeater('obj in jsoninvoices').row(0)).click();
        element(by.css('nav ul li a i.fa-arrow-left')).click();
        // check it was reverted
        element(by.repeater('obj in jsoninvoices').row(0).column('obj.Status')).getText().then(function(name){
            expect(name).toBe('Draft');
        });
    });

    it('should filter an invoice by invoice number', function(){
        element(by.repeater('obj in jsoninvoices').row(0).column('obj.InvoiceNumber')).getText().then(function(number){
            element(by.css('li.dropdown:nth-child(1) > a:nth-child(1)')).click();
            element(by.css('li.dropdown:nth-child(1) > ul:nth-child(2) > li:nth-child(1) > input:nth-child(1)')
                ).sendKeys(number);
            // check it is is displayed
            element(by.repeater('obj in jsoninvoices').row(0).column('obj.InvoiceNumber')).getText().then(function(response){
                expect(response).toBe(number);
            });
        });
    });

    it('should filter an invoice by order number', function(){
        element(by.repeater('obj in jsoninvoices').row(0).column('obj.OrderID')).getText().then(function(number){
            element(by.css('li.dropdown:nth-child(2) > a:nth-child(1)')).click();
            element(by.css('li.dropdown:nth-child(2) > ul:nth-child(2) > li:nth-child(1) > input:nth-child(1)')
                ).sendKeys(number);
            // check it is is displayed
            element(by.repeater('obj in jsoninvoices').row(0).column('obj.OrderID')).getText().then(function(response){
                expect(response).toBe(number);
            });
        });
    });

    it('should filter an invoice by project', function(){
        element(by.css('li.dropdown:nth-child(4) > a:nth-child(1)')).click();
        browser.switchTo().activeElement().sendKeys('TestProject');
        element(by.css('.ac-select-highlight')).click()

        // check the order is displayed
        element(by.repeater('obj in jsoninvoices').row(0).column('obj.Project')).getText().then(function(project){
            expect(project).toBe('TestProject');
        });
    });

    it('should filter an invoice by client', function(){
        element(by.css('li.dropdown:nth-child(5) > a:nth-child(1)')).click();
        browser.switchTo().activeElement().sendKeys('TestClient');
        element(by.css('.ac-select-highlight')).click()
        // check the order is displayed
        element(by.repeater('obj in jsoninvoices').row(0).column('obj.Supplier')).getText().then(function(client){
            expect(client).toBe('TestSupplier');
        });
    });

    it('should filter an invoice by supplier', function(){
        element(by.css('li.dropdown:nth-child(6) > a:nth-child(1)')).click();
        browser.switchTo().activeElement().sendKeys('TestSupplier');
        element(by.css('.ac-select-highlight')).click()

        // check the order is displayed
        element(by.repeater('obj in jsoninvoices').row(0).column('obj.Supplier')).getText().then(function(supplier){
            expect(supplier).toBe('TestSupplier');
        });
    });

    it('should filter an invoice by status', function(){
        element(by.css('.navbar-right > li:nth-child(7) > a:nth-child(1)')).click();
        browser.switchTo().activeElement().sendKeys('Draft');
        element(by.css('.ac-select-highlight')).click()

        // check the order is displayed
        element(by.repeater('obj in jsoninvoices').row(0).column('obj.Status')).getText().then(function(stat){
            expect(stat).toBe('Draft');
        });
    });

});
