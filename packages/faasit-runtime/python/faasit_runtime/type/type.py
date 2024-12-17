class CoreError:
    def __init__(self, code=None, detail=None):
        self.code = code
        self.detail = detail

class CoreResult:
    def __init__(self, ok=None, value=None, error=None):
        self.ok = ok
        self.value = value
        self.error = error

    @staticmethod
    def createSuccessResult(value):
        return CoreResult(True, value=value)

    @staticmethod
    def createFailResult(code, detail):
        error = CoreError(code, detail)
        return CoreResult(False, error=error)
