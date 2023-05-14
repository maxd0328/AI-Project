import React, { useEffect, useRef } from 'react';
import AceEditor from 'react-ace';
import './ScriptEditor.css';

import ace from 'ace-builds';
import 'ace-builds/src-noconflict/theme-dracula';
import 'ace-builds/src-noconflict/ext-language_tools';

import * as Definitions from '../compiler/Definitions';

// This only defines high-level behaviour of the Mode like folding etc.
ace.define('ace/mode/custom', ['require', 'exports', 'ace/lib/oop', 'ace/mode/text', 'ace/mode/custom_highlight_rules'], (acequire, exports) => {
    const oop = acequire('ace/lib/oop');
    const TextMode = acequire('ace/mode/text').Mode;
    const CustomHighlightRules = acequire('ace/mode/custom_highlight_rules').CustomHighlightRules;

    const CstyleBehaviour = acequire('ace/mode/behaviour/cstyle').CstyleBehaviour;

    const CustomBehaviour = function CustomBehaviour() {
        this.inherit(CstyleBehaviour);
    };

    oop.inherits(CustomBehaviour, CstyleBehaviour);

    const Mode = function() {
        this.HighlightRules = CustomHighlightRules;
        this.$behaviour = new CustomBehaviour();
    }

    oop.inherits(Mode, TextMode); // ACE's way of doing inheritance

    exports.Mode = Mode; // eslint-disable-line no-param-reassign
});

// This is where we really create the highlighting rules
ace.define('ace/mode/custom_highlight_rules', ['require', 'exports', 'ace/lib/oop', 'ace/mode/text_highlight_rules'], (acequire, exports) => {
    const oop = acequire('ace/lib/oop');
    const TextHighlightRules = acequire('ace/mode/text_highlight_rules').TextHighlightRules;

    const CustomHighlightRules = function CustomHighlightRules() {
        this.$rules = {
            start: [
                { token: 'annotation', regex: /(?:^|\s)@[A-Za-z_][A-Za-z0-9_]*\b/ },
                { token: 'field', regex: '\\b' + Definitions.toRegex(Definitions.KEYS) + '\\b' },
                { token: 'enum', regex: '\\b' + Definitions.toRegex(Definitions.ENUMS) + '\\b' },
                { token: 'identifier', regex: '\\b[A-Za-z_][A-Za-z0-9_]*\\b' },
                { token: 'operator', regex: '[=\\{\\},\\(\\)]' },
                { token: 'numeric', regex: '(?<![A-Za-z0-9.])[-]?(\\d+\\.?|\\d*\\.\\d+)(?![A-Za-z0-9.])' },
                { token: 'comment', regex: '#.*$' }
            ]
        };
    };

    oop.inherits(CustomHighlightRules, TextHighlightRules);

    exports.CustomHighlightRules = CustomHighlightRules;
});

const ScriptEditor = (props) => {
    const aceEditor = useRef(null);
    useEffect(() => {
        const editor = aceEditor.current.editor;
        editor.setOptions({
            enableBasicAutocompletion: true
        });
    }, []);

    const handleChange = (event) => {
        props.callback(event);
    };

    return (
        <AceEditor
            mode="custom"
            theme="dracula"
            className="ace-matej"
            fontSize={14}
            width="100%"
            height="100%"
            editorProps={{ $blockScrolling: true, wrapEnabled: true }}
            value={props.children}
            onChange={handleChange}
            ref={aceEditor}
        />
    );
};

export default ScriptEditor;
