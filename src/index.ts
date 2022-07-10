import dotenv from "dotenv";
dotenv.config();

import { Client, Intents, Modal, ModalActionRowComponent, MessageActionRow, TextInputComponent, MessageAttachment } from "discord.js";
import * as ts from "typescript";
import fs from "node:fs";
import path from "node:path";

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGES,
  ],
  restTimeOffset: 0,
});

client.on("ready", (cl) => {
  console.log(`Logged in as ${cl.user.tag}!`);
  cl.user.setActivity("TypeScript Transpiler", { type: "WATCHING" });
  cl.application.commands.set([
    {
      name: "transpile",
      description: "Transpile a code snippet",
    },
    {
      name: "Transpile this",
      type: "MESSAGE"
    }
  ], process.env.GUILD_ID!);
});

client.on("interactionCreate", async (i) => {
  if (i.isCommand()) {
    if (i.commandName === "transpile") {
      const modal = new Modal()
        .setTitle("Transpile")
        .setCustomId("transpile_modal")
        .setComponents(
          new MessageActionRow<ModalActionRowComponent>()
            .addComponents([
              new TextInputComponent()
                .setCustomId("transpile_input")
                .setLabel("Code")
                .setMaxLength(2000)
                .setMinLength(1)
                .setPlaceholder("Type your code here")
                .setRequired(true)
                .setStyle("PARAGRAPH")
            ])
        );
      i.showModal(modal).catch(console.error);
    }
  } else if (i.isModalSubmit()) {
    if (i.customId === "transpile_modal") {
      const code = i.fields.getTextInputValue("transpile_input");
      await i.reply("Writing...");
      const filename = `${Date.now()}`;
      fs.writeFileSync(path.join(__dirname, `${filename}.ts`), code);
      await i.editReply("Creating program...");
      const program = ts.createProgram([path.join(__dirname, `${filename}.ts`)], {
        strict: true,
        target: ts.ScriptTarget.ES2021,
        module: ts.ModuleKind.CommonJS,
        declaration: true,
        esModuleInterop: true,
      });
      await i.editReply("Transpiling...");
      const transpileResult = program.emit();
      const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(transpileResult.diagnostics);
      let errors = "";
      allDiagnostics.forEach((diagnostic) => {
        if (diagnostic.file) {
          const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!);
          const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
          errors += (`(${line + 1},${character + 1}): ${message}`);
        } else {
          errors += (ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
        }      
      });
      await i.editReply({
        content: `Exit code: ${transpileResult.emitSkipped ? 1 : 0}`,
        files: [
          new MessageAttachment(
            Buffer.from(fs.readFileSync(path.join(__dirname, `${filename}.js`))),
            `transpiled.js`
          ),
          new MessageAttachment(
            Buffer.from(fs.readFileSync(path.join(__dirname, `${filename}.d.ts`))),
            `transpiled.d.ts`
          ),
          new MessageAttachment(
            Buffer.from(errors),
            `errors.txt`
          )
        ]
      });
      try {
        fs.unlinkSync(path.join(__dirname, `${filename}.ts`));
        fs.unlinkSync(path.join(__dirname, `${filename}.js`));
        fs.unlinkSync(path.join(__dirname, `${filename}.d.ts`));
      } catch {};
    }
  }
})

client.login();