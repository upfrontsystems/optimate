describe('Orders page', function() {
    beforeEach(function () {
        browser.get('http://127.0.0.1:8000/#/orders');
    });

    // tests it's on the orders page
    it('should be on the orders page', function() {
        expect(browser.driver.getCurrentUrl()).toBe('http://127.0.0.1:8000/#/orders');
    });

    // add an order
    it('should add an order by supplier', function(){
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

    it('should add an order by resource', function(){
        // delete the previous order
        element(by.repeater('obj in jsonorders').row(0)).click();
        element(by.css('nav ul li a i.fa-trash')).click();
        element(by.buttonText('Delete')).click();

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

        // add budget items from resources
        expect(addOrderModal.element(by.css('.modal-footer i.fa-plus')).isEnabled()).toBe(true);
        addOrderModal.element(by.css('.modal-footer i.fa-plus')).click();
        addOrderModal.element(by.linkText('Resource')).click();
        // send the data
        var selectButton = addOrderModal.element(by.css('div.ui-select-container'));
        var selectInput = selectButton.element(by.css('.ui-select-search'));
        // click to open select
        addOrderModal.element(by.css('div.ui-select-container div.ui-select-match span.ui-select-input')).click();
        // send text
        selectInput.sendKeys('TestResource');
        // select first element
        element.all(by.css('.ui-select-choices-row-inner span')).first().click();
        addOrderModal.element(by.buttonText('Submit')).click();
        addOrderModal.element(by.buttonText('Save')).click();

        // check the order was added
        element(by.repeater('obj in jsonorders').row(0).column('obj.Project')).getText().then(function(name){
            expect(name).toBe(projectname);
        });
    });

    it('should add an order by budget item', function(){
        // delete the previous order
        element(by.repeater('obj in jsonorders').row(0)).click();
        element(by.css('nav ul li a i.fa-trash')).click();
        element(by.buttonText('Delete')).click();

        // open the add order modal and fill in the form
        var addOrderModal = element(by.id('saveOrderModal'));
        var projectname = 'TestProject';
        element(by.css('nav ul li a i.fa-plus-square')).click();
        expect(addOrderModal.isDisplayed()).toBe(true);
        addOrderModal.element(by.css('form.form-horizontal:nth-child(2) > div:nth-child(1) > div:nth-child(2) > textarea:nth-child(2)')).sendKeys('Testing Description');
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

        // add budget items
        expect(addOrderModal.element(by.css('.modal-footer i.fa-plus')).isEnabled()).toBe(true);
        addOrderModal.element(by.css('.modal-footer i.fa-plus')).click();
        addOrderModal.element(by.css('ol.ng-pristine:nth-child(1) > li:nth-child(1) > ol:nth-child(2) > li:nth-child(1) > div:nth-child(1) > button:nth-child(7)')).click()
        addOrderModal.element(by.buttonText('Submit')).click();

        // insert quantities
        var slickgrid = element(by.id('budgetitem-data-grid'));
        slickgrid.element(by.css('div.ui-widget-content:nth-child(1) > div:nth-child(8)')).click();
        slickgrid.element(by.css('.editor-text')).sendKeys('11.896');
        slickgrid.element(by.css('div.ui-widget-content:nth-child(1) > div:nth-child(7)')).click();
        slickgrid.element(by.css('.editor-text')).sendKeys('100.01');
        slickgrid.element(by.css('div.ui-widget-content:nth-child(1) > div:nth-child(5)')).click();
        slickgrid.element(by.css('.editor-text')).sendKeys('27');
        slickgrid.element(by.css('div.ui-widget-content:nth-child(1) > div:nth-child(4)')).click();
        slickgrid.element(by.css('span.slick-column-name > i.fa-check-square-o')).click();
        addOrderModal.element(by.buttonText('Save')).click();

        // check the order was added
        element(by.repeater('obj in jsonorders').row(0).column('obj.Project')).getText().then(function(name){
            expect(name).toBe(projectname);
        });
    });

    it('should edit an order', function(){
        element(by.repeater('obj in jsonorders').row(0)).click();
        element(by.css('nav ul li a i.fa-pencil')).click();

        // open the add order modal and fill in the form
        var addOrderModal = element(by.id('saveOrderModal'));
        expect(addOrderModal.isDisplayed()).toBe(true);
        addOrderModal.element(by.css('form.form-horizontal:nth-child(2) > div:nth-child(1) > div:nth-child(2) > textarea:nth-child(2)')
            ).clear().sendKeys('Editing Description');

        var slickgrid = element(by.id('budgetitem-data-grid'));
        // check the total
        slickgrid.element(by.css('div.ui-widget-content:nth-child(1) > div:nth-child(8)')).getText().then(function(txt){
            expect(txt).toBe('R868.50');
        });
        addOrderModal.element(by.buttonText('Update')).click();
    });
});
