import { DefaultWorkspaceManager, LangiumDocument, LangiumDocumentFactory, LangiumSharedServices } from "langium";

import * as builtins from '../builtins'
import { WorkspaceFolder } from "vscode-languageserver-types";
import { URI } from "vscode-uri";

export class FaasitWorkspaceManager extends DefaultWorkspaceManager {

  private documentFactory: LangiumDocumentFactory;

  constructor(services: LangiumSharedServices) {
    super(services);
    this.documentFactory = services.workspace.LangiumDocumentFactory
  }

  protected override async loadAdditionalDocuments(folders: WorkspaceFolder[], collector: (document: LangiumDocument) => void): Promise<void> {
    await super.loadAdditionalDocuments(folders, collector);
    collector(this.documentFactory.fromString(builtins.BuiltinCore, URI.parse('faasit-builtin:///core.ft')))
  }
}