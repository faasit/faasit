package cn.njuics.faasit.dsl.ide.contentassist;

import cn.njuics.faasit.dsl.faasIt.FaasItPackage;
import cn.njuics.faasit.dsl.services.FaasItGrammarAccess;
import org.eclipse.xtext.RuleCall;
import org.eclipse.xtext.ide.editor.contentassist.ContentAssistContext;
import org.eclipse.xtext.ide.editor.contentassist.IIdeContentProposalAcceptor;
import org.eclipse.xtext.ide.editor.contentassist.IdeContentProposalProvider;
import org.eclipse.xtext.scoping.IScope;
import org.eclipse.xtext.scoping.IScopeProvider;

import com.google.common.base.Joiner;
import com.google.common.collect.Iterables;
import com.google.inject.Inject;

public class FaasItIdeContentProposalProvider extends IdeContentProposalProvider {
	@Inject
	private FaasItGrammarAccess myDslGrammarAccess;

	@Inject
	private IScopeProvider scopeProvider;

	@Override
	protected void _createProposals(RuleCall ruleCall, ContentAssistContext context,
			IIdeContentProposalAcceptor acceptor) {
		if (myDslGrammarAccess.getGreetingRule().equals(ruleCall.getRule()) && context.getCurrentModel() != null) {
			IScope scope = scopeProvider.getScope(context.getCurrentModel(), FaasItPackage.Literals.GREETING__FROM);
			acceptor.accept(getProposalCreator().createSnippet(
					"Hello ${1|A,B,C|} from ${2|" + Joiner.on(",")
							.join(Iterables.transform(scope.getAllElements(), it -> it.getName().toString())) + "|}!",
					"New Greeting (Template with Choice)", context), 0);
			acceptor.accept(getProposalCreator().createSnippet("Hello ${1:name} from ${2:fromName}!",
					"New Greeting (Template with Placeholder)", context), 0);
		}
		super._createProposals(ruleCall, context, acceptor);
	}
}
