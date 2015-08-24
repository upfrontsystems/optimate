from xhtml2pdf import tables

class pisaTagTABLE(tables.pisaTagTABLE):
    """ Hackery to make pisa listen to a height css attribute on
        table cell, so we can avoid the expensive calculation. """
    def end(self, c):
        h, u = c.cssAttr.get('height', (None, None))
        if u == u'px':
            c.tableData.rowh = int(h)
        return tables._old_pisaTagTABLE.end(self, c)

tables._old_pisaTagTABLE = tables.pisaTagTABLE
tables.pisaTagTABLE = pisaTagTABLE
