package org.trainingJAR;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/training")
public class TrainingController {

    @PostMapping("/stop")
    public String stopTraining() {
        Main.keepTraining = false;
        return "Training stopped";
    }
}
