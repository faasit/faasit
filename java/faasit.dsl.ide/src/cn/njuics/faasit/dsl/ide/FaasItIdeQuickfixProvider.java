package cn.njuics.faasit.dsl.ide;

import cn.njuics.faasit.dsl.validation.FaasItValidator;
import org.eclipse.xtext.ide.editor.quickfix.AbstractDeclarativeIdeQuickfixProvider;
import org.eclipse.xtext.ide.editor.quickfix.DiagnosticResolutionAcceptor;
import org.eclipse.xtext.ide.editor.quickfix.QuickFix;
import org.eclipse.xtext.xbase.lib.StringExtensions;

public class FaasItIdeQuickfixProvider extends AbstractDeclarativeIdeQuickfixProvider {
	
	@QuickFix(FaasItValidator.INVALID_NAME)
	public void textFixLowerCaseName(DiagnosticResolutionAcceptor acceptor) {
		acceptor.accept("Capitalize Name",  (diagnostic, obj, document) -> {
			return createTextEdit(diagnostic, StringExtensions.toFirstUpper(document.getSubstring(diagnostic.getRange())));
		}
			
		);
	}

}
