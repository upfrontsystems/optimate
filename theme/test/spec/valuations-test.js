describe('Valuations page', function() {
    beforeEach(function () {
        browser.get('http://127.0.0.1:8000/#/valuations');
    });

    // tests its on the valuations page
    it('should be on the valuations page', function() {
        expect(browser.driver.getCurrentUrl()).toBe('http://127.0.0.1:8000/#/valuations');
    });

    // add a valuation
    it('should add a valuation', function(){
        // open the add valuation modal and fill in the form
        var addValuationModal = element(by.id('saveValuationModal'));
        var projectname = "TestProject";
        element(by.css('nav ul li a i.fa-plus-square')).click();
        expect(addValuationModal.isDisplayed()).toBe(true);
        var projectselect = addValuationModal.element(by.id('inputProject_chosen'))
        projectselect.click();
        browser.actions().sendKeys(projectname).perform();
        projectselect.all(by.css('.chosen-results li')).then(function(items) {
            items[0].click();
        });

        addValuationModal.element(by.css('#inputDate i.fa-calendar')).click();
        addValuationModal.element(by.css('#inputDate ul table tbody tr td.day.active')).click();
        browser.waitForAngular();
        // add the percentage in the slickgrid
        addValuationModal.element(by.css('div.ui-widget-content:nth-child(2) > div:nth-child(3)')).click();
        addValuationModal.element(by.css('.editor-text')).sendKeys(80);
        addValuationModal.element(by.css('div.ui-widget-content:nth-child(4) > div:nth-child(4)')).click();
        addValuationModal.element(by.buttonText('Save')).click();

        // check the valuation was added
        element(by.repeater('obj in jsonvaluations').row(0).column('obj.Project')).getText().then(function(name){
            expect(name).toBe(projectname);
        });
    });

    it('should edit a valuation', function(){
        element(by.repeater('obj in jsonvaluations').row(0)).click();
        expect(element(by.css('nav ul li a i.fa-pencil')).isDisplayed()).toBe(true);
        element(by.css('nav ul li a i.fa-pencil')).click();

        var addValuationModal = element(by.id('saveValuationModal'));
        expect(addValuationModal.isDisplayed()).toBe(true);

        // expand a budgetgroup
        addValuationModal.element(by.css('div.slick-cell.l0.r0')).click();
        expect(addValuationModal.element(
            by.css('i.fa-caret-square-o-down')
            ).isDisplayed()).toBe(true);
        addValuationModal.element(by.css('i.fa-caret-square-o-down')).click();
        // edit the budget total
        addValuationModal.element(by.css('div:nth-child(2) > div.slick-cell.l1.r1.cell.editable-column')).click();
        addValuationModal.element(by.css('.editor-text')).sendKeys(1000);
        addValuationModal.element(by.css('div:nth-child(2) > div.slick-cell.l2.r2.cell.editable-column')).click();
        addValuationModal.element(by.css('.editor-text')).sendKeys(95);
        addValuationModal.element(by.css('div.ui-widget-content:nth-child(4) > div:nth-child(2)')).click();
        addValuationModal.element(by.css('.editor-text')).sendKeys(100);
        addValuationModal.element(by.css('div.ui-widget-content:nth-child(4) > div:nth-child(3)')).click();
        addValuationModal.element(by.css('.editor-text')).sendKeys(20);
        addValuationModal.element(by.css('div.ui-widget-content:nth-child(4) > div:nth-child(1)')).click();
        addValuationModal.element(by.buttonText('Update')).click();
        // check the total has changed
        element(by.repeater('obj in jsonvaluations').row(0).column('obj.AmountClaimed')
            ).getText().then(function(amount){
            expect(amount).toBe('R970.00');
        });
    });

    it('should filter a valuation by project', function(){
        element(by.css('li.dropdown:nth-child(1) > a:nth-child(1)')).click();
        browser.waitForAngular();
        browser.switchTo().activeElement().sendKeys('TestProject');
        browser.waitForAngular();
        element(by.css('.ac-select-highlight')).click()

        // check the order is displayed
        element(by.repeater('obj in jsonvaluations').row(0).column('obj.Project')).getText().then(function(project){
            expect(project).toBe('TestProject');
        });
    });

    it('should filter a valuation by status', function(){
        element(by.css('.navbar-right > li:nth-child(3) > a:nth-child(1)')).click();
        browser.switchTo().activeElement().sendKeys('Draft');
        element(by.css('.ac-select-highlight')).click()

        // check the order is displayed
        element(by.repeater('obj in jsonvaluations').row(0).column('obj.Status')).getText().then(function(stat){
            expect(stat).toBe('Draft');
        });
    });
});
