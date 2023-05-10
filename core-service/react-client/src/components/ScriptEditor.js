import React from 'react';
import AceEditor from 'react-ace';
import './ScriptEditor.css';

import ace from 'ace-builds';
import 'ace-builds/src-noconflict/theme-dracula';
import 'ace-builds/src-noconflict/ext-language_tools';

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
                { token: 'field', regex: '\\b(activation|dataShape|type|poolingShape|stride|poolingType|padding)\\b' },
                { token: 'enum', regex: '\\b(POOLING|MAX)\\b' },
                { token: 'identifier', regex: '\\b[A-Za-z_][A-Za-z0-9_]*\\b' },
                { token: 'operator', regex: '[=\\{\\},]' },
                { token: 'numeric', regex: '(?<![A-Za-z0-9.])[-]?(\\d+\\.?|\\d*\\.\\d+)(?![A-Za-z0-9.])' },
                { token: 'comment', regex: '#.*$' }
            ]
        };
    };

    oop.inherits(CustomHighlightRules, TextHighlightRules);

    exports.CustomHighlightRules = CustomHighlightRules;
});

class ScriptEditor extends React.Component {

    constructor(props) {
        super(props);
        this.handleChange = this.handleChange.bind(this);
    }

    handleChange(value) {
        this.props.callback(value);
    }

    componentDidMount() {
        const editor = this.aceEditor.editor;
        editor.setOptions({
            enableBasicAutocompletion: true
        });
    }

    render() {
        return (
            <AceEditor
                mode="custom"
                theme="dracula"
                className="ace-matej"
                fontSize={14}
                width="100%"
                height="100%"
                editorProps={{ $blockScrolling: true, wrapEnabled: true }}
                value={this.props.children}
                onChange={this.handleChange}
                ref={(instance) => { this.aceEditor = instance; }}
            />
        );
    }

}

export default ScriptEditor;
