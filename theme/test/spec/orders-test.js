describe('Orders page', function() {
    beforeEach(function () {
        browser.get('http://127.0.0.1:8000/#/orders');
    });

    // tests its on the orders page
    it('should be on the orders page', function() {
        expect(browser.driver.getCurrentUrl()).toBe('http://127.0.0.1:8000/#/orders');
    });

    // add an order
    it('should add an order', function(){
        // open the add order modal and fill in the form
        var addOrderModal = element(by.id('saveOrderModal'));
        var projectname = 'TestProject';
        element(by.css('nav ul li a i.fa-plus-square')).click();
        expect(addOrderModal.isDisplayed()).toBe(true);
        var projectselect = addOrderModal.element(by.id('inputProject_chosen'))
        projectselect.click();
        projectselect.element(by.css('.chosen-search input')).sendKeys(projectname);
        projectselect.all(by.css('.chosen-results li')).then(function(items) {
          items[0].click();
        });
        var supplierselect = addOrderModal.element(by.id('inputSupplier_chosen'))
        supplierselect.click();
        browser.actions().sendKeys('TestSupplier').perform();
        supplierselect.all(by.css('.chosen-results li')).then(function(items) {
          items[0].click();
        });
        addOrderModal.element(by.css('#inputDate i.fa-calendar')).click();
        addOrderModal.element(by.css('#inputDate ul table tbody tr td.day.active')).click()
        // addOrderModal.element(by.model('formData.Description')).sendKeys('Test order description');

        // add budget items from the tree
        // expect(addOrderModal.element(by.css('.modal-footer i.fa-plus')).isEnabled()).toBe(true);
        // addOrderModal.element(by.css('.modal-footer i.fa-plus')).click();
        // addOrderModal.element(by.linkText('Budget')).click();
        // expect(addOrderModal.element(by.id('tree-root')).isDisplayed()).toBe(true);
        // addOrderModal.element(by.css('#tree-root ol li ol li [data-ng-show="true"] i.fa-square-o')).click();
        // browser.waitForAngular();
        // addOrderModal.element(by.buttonText('Submit')).click();
        // browser.waitForAngular();
        // addOrderModal.element(by.buttonText('Save')).click();

        // add budget items from suppliers
        expect(addOrderModal.element(by.css('.modal-footer i.fa-plus')).isEnabled()).toBe(true);
        addOrderModal.element(by.css('.modal-footer i.fa-plus')).click();
        addOrderModal.element(by.linkText('Supplier')).click();
        var supplierselect = addOrderModal.element(by.id('selectSupplier_chosen'));
        supplierselect.click();
        browser.actions().sendKeys('TestSupplier').perform();
        supplierselect.all(by.css('.chosen-results li')).then(function(items) {
          items[0].click();
        });
        addOrderModal.element(by.buttonText('Submit')).click();
        addOrderModal.element(by.buttonText('Save')).click();

        // check the order was added
        element(by.repeater('obj in jsonorders').row(0).column('obj.Project')).getText().then(function(name){
            expect(name).toBe(projectname);
        });
    });
});
